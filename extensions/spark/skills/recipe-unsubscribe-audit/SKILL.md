---
name: recipe-unsubscribe-audit
description: >-
  Full unsubscribe audit: scan inbox, archive, and GateKeeper for newsletter
  senders, classify by volume and engagement, detect phishing and duplicate
  subscriptions, then unsubscribe via the action tool or extracted footer links.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: triage
---

# Recipe: Unsubscribe Audit

Audit every newsletter pool, recommend unsubscribe candidates backed by engagement data, and execute only after the user approves the list. Spark supplies the data (senders, volumes, read flags, bodies); the agent owns classification, duplicate verification, and execution.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** triage.

## Steps

### Step 1: Scan all three pools

An inbox-only scan misses most of the volume. Check all three:

```
# Unified inbox, all accounts (paginate to get everything)
emails { "folder": "Inbox", "filter": "category:newsletter newer_than:30d", "page_size": 100 }

# Auto-archived mail — Gmail filters/automations often skip the inbox
# entirely; repeat per Gmail-backed account. This pool can be the largest.
emails { "folder": "user@gmail.com:Archive", "filter": "category:newsletter newer_than:14d", "page_size": 100 }

# GateKeeper queue — new senders held outside the inbox view
emails { "folder": "Inbox", "new_senders": true, "page_size": 50 }
```

### Step 2: Aggregate and classify

Count per sender: emails per 30 days and unread rate (from the Flags column). Classify into tiers:

| Tier | Signal | Action |
|---|---|---|
| Unsubscribe | Pure marketing/drip, ~100% unread | Recommend removal |
| Consider | High volume, partial engagement | User's call; suggest digest or auto-summary |
| Keep | Mostly read | Leave alone |
| Transactional | Invoices, PINs, order/security notices | Exclude from the audit |
| Phishing | See below | Mark as spam — NEVER unsubscribe |
| App-nag | Instagram/LinkedIn-style notification mail | Fix in the app's notification settings |

**Phishing tripwire:** brand name in the display name but an unrelated sender domain (e.g. "SpotifyUS" from `mail@jhbuilder.com`), urgent billing/security subjects. Clicking anything — including unsubscribe — confirms the address is live. Flag prominently; recommend mark-as-spam instead. The same applies to everything already in the Spam folder: never unsubscribe there.

Present the classification and **wait for the user to confirm or amend the list** before acting. Expect them to rescue a few senders.

### Step 3: Verify duplicate copies before acting

When the same newsletter arrives 2+ times, do NOT assume two subscriptions:

1. Compare `To:` headers of the copies via the `thread` tool. Different addresses → genuinely separate subscriptions; unsubscribe the unwanted copy using the link **from that specific copy** (tokens are per-subscription).
2. Substack: decode the `https://substack.com/redirect/2/<base64url-JSON>` unsubscribe link; the payload's `u` field is the subscription ID. Same `u` in both copies → one subscription delivered twice (alias/forward). Unsubscribing kills it entirely — report instead of acting.
3. Same `To:`, same account (e.g. Patreon) → same situation; skip and report.

### Step 4: Unsubscribe approved senders

For each approved sender, try Spark's built-in mechanism first:

```
action { "action_name": "unsubscribe", "message_ids": ["<id>"] }
```

If the tool is unavailable in the installed Spark MCP server or the sender has no `List-Unsubscribe` mechanism, fall back to footer-link extraction — read the thread and scan its body footer for unsubscribe links (matching `unsub`, `optout`, `opt-out`, `preference`, `darse de baja`):

```
thread { "message_id": "<id>" }
```

Then complete each link in a browser (agent-driven browser automation or hand the list to the user). Browser rules: one-click confirmations are common; preference centers need "unsubscribe from all marketing" + save; never type personal data (pre-filled email fields are fine); login walls, captchas, and errors → record as blocked and move on. Footers vary by language and ESP — if the pattern misses, read the last ~25 lines of the body and pick the actual unsubscribe link, not adjacent tracking links.

For senders that should be blocked entirely (cold outreach, spam-adjacent):

```
contact-action { "action_name": "blockContact", "emails": ["spammer@example.com"] }
contact-action { "action_name": "blockDomain", "emails": ["example.com"] }
```

### Step 5: Tame the keepers

For high-volume senders the user keeps:

```
contact-action { "action_name": "enableAutosummaryForContact", "emails": ["newsletter@example.com"] }
contact-action { "action_name": "groupEmailsFromContact", "emails": ["sender@example.com"] }
```

### Step 6: Report

Summarize: senders removed, emails/month saved, blocked items with manual next steps, app-nag senders to fix in-app, phishing marked as spam, and duplicates that need account-level fixes (e.g. Substack account settings, forwarding rules).

## Tips

- Engagement data makes recommendations credible: "30 emails/month, 100% unread" beats "looks like marketing".
- Click-tracker redirect links (SendGrid, Braze, e.zoom.us, klclick, webengage) are fine — the browser follows them to the real unsubscribe page.
- Sendy footers contain both `/l/...` (tracking) and `/unsubscribe/...` links — pick the latter.
- `unsubscribe` via the mailing list's own mechanism is cleaner than blocking; reserve `blockContact`/`blockDomain` for senders that ignore unsubscribes.
- Run this recipe quarterly; subscriptions regrow.
