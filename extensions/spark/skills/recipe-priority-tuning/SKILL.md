---
name: recipe-priority-tuning
description: >-
  Fine-tune Spark's priority category by marking key contacts as primary
  and adjusting notification importance.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: triage
---

# Recipe: Priority Tuning

Fine-tune who gets auto-prioritized by reviewing the current priority category and adjusting contact-level settings.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** triage.

## Steps

### Step 1: Review current priority mail

```
emails { "folder": "Inbox", "filter": "category:priority newer_than:14d" }
```

Look at which senders appear in the priority category. Ask the user: are these the right people? Anyone missing? Anyone who shouldn't be here?

### Step 2: Check who's currently marked as primary

Browse priority mail to identify the senders Spark is auto-prioritizing. Note any patterns - are important contacts missing, or are low-priority senders appearing?

### Step 3: Add missing VIPs

For contacts whose emails should always be prioritized:

```
contact-action { "action_name": "markContactAsPrimary", "emails": ["vip@company.com"] }
```

This tells Spark to auto-prioritize all future email from this sender.

### Step 4: Remove false priorities

For contacts that are showing up in priority but shouldn't be:

```
contact-action { "action_name": "unmarkContactAsPrimary", "emails": ["noisy-sender@example.com"] }
```

### Step 5: Adjust notification importance

For contacts where the user wants push notifications:

```
contact-action { "action_name": "markContactAsImportant", "emails": ["boss@company.com"] }
```

For contacts that are priority but don't need notifications:

```
contact-action { "action_name": "unmarkContactAsImportant", "emails": ["low-urgency@example.com"] }
```

### Step 6: Verify the changes

```
emails { "folder": "Inbox", "filter": "category:priority is:unread" }
```

Check that the priority category now reflects the user's preferences. New mail from adjusted contacts will appear in the correct category.

## Tips

- `markContactAsPrimary` is the strongest signal - it guarantees the contact's emails land in priority.
- `markContactAsImportant` controls push notifications, which is separate from category placement.
- Changes apply to all future mail from the contact, not retroactively to existing emails.
- Run this recipe after onboarding a new client, joining a new team, or changing roles - priority contacts change with context.
- When contacts are in the wrong category entirely (not just missing from priority), use `contact-action`'s `changeCategoryPersonal` / `changeCategoryNotification` / `changeCategoryNewsletters` to reclassify all future mail from that sender.
- A well-tuned priority category means the user can check just `category:priority` for a reliable "must-read" view.
