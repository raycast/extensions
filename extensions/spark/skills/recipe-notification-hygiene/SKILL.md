---
name: recipe-notification-hygiene
description: >-
  Tame notification overload by reclassifying noisy senders, grouping repetitive
  notifications, and bulk-archiving cleared alerts.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: triage
---

# Recipe: Notification Hygiene

Tame notification overload by identifying noisy senders, reclassifying misplaced mail, grouping repetitive notifications, and clearing out what's no longer relevant.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** triage.

## Steps

### Step 1: Assess notification volume

```
emails { "folder": "Inbox", "filter": "category:notification is:unread" }
```

Count the unread notifications. If the number is high, scan the sender list for patterns - which senders dominate?

### Step 2: Identify noisy senders

Look for senders that generate high-volume, low-value notifications (CI bots, social media alerts, shipping updates after delivery, etc.).

Read a few to confirm they're noise:

```
thread { "message_id": "<id>" }
```

### Step 3: Reclassify misplaced senders

Some "notifications" are really newsletters in disguise:

```
contact-action { "action_name": "changeCategoryNewsletters", "emails": ["noisy-digest@example.com"] }
```

Some are actually from real people and should be in People:

```
contact-action { "action_name": "changeCategoryPersonal", "emails": ["colleague@example.com"] }
```

These changes apply to all future mail from the sender.

### Step 4: Group repetitive senders

For senders that are useful but send too often (CI systems, monitoring alerts):

```
contact-action { "action_name": "groupEmailsFromContact", "emails": ["ci-bot@company.com"] }
```

This collapses their messages into grouped entries, reducing inbox clutter while keeping them accessible.

### Step 5: Bulk archive cleared notifications

For notifications that have been seen and are no longer relevant:

```
action { "action_name": "archive", "message_ids": ["<id1>", "<id2>", "<id3>"] }
```

Pass multiple IDs in a single call to archive in batch.

### Step 6: Disable notifications for low-priority senders

For senders whose emails you want to receive but not be alerted about:

```
contact-action { "action_name": "unmarkContactAsImportant", "emails": ["alerts@service.com"] }
```

## Tips

- The goal is to reduce the notification count to a manageable number, not zero - some notifications are genuinely useful.
- Reclassification at the contact level (`contact-action`) is more effective than per-message (`action`) because it fixes all future mail.
- Grouping is a middle ground between keeping and blocking - the emails still arrive but don't flood the inbox.
- Run this recipe after a vacation or any period of inbox neglect to quickly get notifications under control.
- Combine with `recipe-newsletter-cleanup` for a full inbox declutter session.
