---
name: recipe-new-sender-review
description: >-
  Process GateKeeper's new sender queue: review, accept legitimate contacts,
  and block unwanted senders.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: triage
---

# Recipe: New Sender Review

Process Spark's GateKeeper queue of new senders. Review each, accept legitimate contacts, and block unwanted ones.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** triage.

## Steps

### Step 1: Check the new senders queue

```
emails { "folder": "Inbox", "new_senders": true }
```

This shows emails from senders that GateKeeper has quarantined (explicit mode). The normal inbox view filters these out automatically.

### Step 2: Review each sender

For each new sender email, read the content:

```
thread { "message_id": "<id>" }
```

Decide: is this a legitimate contact or unwanted mail?

### Step 3: Accept legitimate senders

```
contact-action { "action_name": "acceptContact", "emails": ["sender@company.com"] }
```

This moves the sender past GateKeeper - their future emails appear in the normal inbox.

To accept an entire domain:

```
contact-action { "action_name": "acceptDomain", "emails": ["company.com"] }
```

### Step 4: Block unwanted senders

```
contact-action { "action_name": "blockContact", "emails": ["spammer@example.com"] }
```

To block an entire domain:

```
contact-action { "action_name": "blockDomain", "emails": ["example.com"] }
```

### Step 5: Verify

```
emails { "folder": "Inbox", "new_senders": true }
```

Confirm the queue is empty or report what's left.

## Tips

- GateKeeper only shows new sender emails when `emails` is called with `new_senders` - they're filtered from the normal inbox view.
- When in doubt, accept the contact first. You can always block them later.
- `acceptDomain` is useful for legitimate companies with multiple sender addresses (support@, billing@, etc.).
- `blockDomain` is aggressive - use it for clearly spammy domains, not for individual unwanted senders.
- Run this recipe regularly (daily or every few days) so legitimate contacts don't wait too long in the queue.
- The new senders count appears at the top of the inbox output when there are queued items.
