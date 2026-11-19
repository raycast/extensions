---
name: recipe-newsletter-cleanup
description: >-
  Audit newsletter subscriptions: block unwanted senders, unsubscribe from
  mailing lists, and enable AI summaries for worth-keeping ones.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: triage
---

# Recipe: Newsletter Cleanup

Audit and prune newsletter subscriptions. Block the unwanted, unsubscribe from the noisy, and enable AI summaries for the ones worth keeping.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** triage.

## Steps

### Step 1: List all newsletters

```
emails { "folder": "Inbox", "filter": "category:newsletter" }
```

Review the senders. Look for patterns: senders the user never reads, duplicates, or obsolete subscriptions.

### Step 2: Review individual newsletters

For each sender the user wants to evaluate:

```
thread { "message_id": "<id>" }
```

### Step 3: Remove unwanted subscriptions

For mailing lists with an unsubscribe mechanism:

```
action { "action_name": "unsubscribe", "message_ids": ["<id>"] }
```

For senders that should be blocked entirely:

```
contact-action { "action_name": "blockContact", "emails": ["spammer@example.com"] }
```

To block an entire domain:

```
contact-action { "action_name": "blockDomain", "emails": ["example.com"] }
```

### Step 4: Enable AI summaries for keepers

For newsletters the user wants to keep but not read in full:

```
contact-action { "action_name": "enableAutosummaryForContact", "emails": ["newsletter@example.com"] }
```

### Step 5: Group repetitive senders

For senders that send frequently, group their emails to reduce inbox clutter:

```
contact-action { "action_name": "groupEmailsFromContact", "emails": ["sender@example.com"] }
```

## Tips

- Start with `emails` on `Inbox` filtered to `category:newsletter` and a `page_size` of 50 to see a broad list of senders.
- Ask the user which senders they actually read before blocking anything.
- `unsubscribe` works through the mailing list's unsubscribe mechanism - it's cleaner than blocking.
- `blockContact` stops all future mail from appearing; `blockDomain` is more aggressive.
- Auto-summary generates a brief AI summary at the top of each email from that sender - great for digests.
- Grouping (`groupEmailsFromContact`) collapses repeated messages from the same sender into a single entry.
- Run this recipe periodically (monthly) to keep the newsletter list pruned.
