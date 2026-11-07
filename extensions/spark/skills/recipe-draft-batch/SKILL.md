---
name: recipe-draft-batch
description: >-
  Review and finalize multiple pending drafts in a batch session: read
  context, edit, or discard.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: triage
---

# Recipe: Draft Batch Review

Review and finalize multiple pending drafts in a single session. Read context for each, decide whether to edit, keep, or discard.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** triage.

## Steps

### Step 1: List all pending drafts

```
emails { "folder": "Drafts" }
```

Review the list of drafts - note subjects, recipients, and dates.

### Step 2: Review each draft in context

For each draft, read the full thread to understand the context:

```
thread { "message_id": "<id>" }
```

Check if the conversation has moved on since the draft was created - someone else may have replied, or the topic may be resolved.

### Step 3: Decide on each draft

For each draft, present the options to the user:

**Edit** - the draft needs changes before sending:

```
draft { "edit": "<id>", "body": "Updated content..." }
draft { "edit": "<id>", "subject": "Updated subject" }
```

**Keep as-is** - the draft is ready to send. Note it for the user.

**Discard** - the draft is no longer needed. Move to trash:

```
action { "action_name": "moveToTrash", "message_ids": ["<id>"] }
```

### Step 4: Report

Summarize: "Reviewed N drafts. M edited, K ready to send, L discarded."

## Tips

- Drafts accumulate when the user starts replies but doesn't finish them. This recipe clears the backlog.
- Always read the thread before editing a draft - the context may have changed since it was created.
- If a thread has new replies since the draft was created, the draft may be outdated and need rewriting.
- `draft`'s `edit` updates the draft in place - it doesn't create a new one.
- For drafts that are replies (`reply_to`), read the original thread to verify the reply still makes sense.
- Run this recipe weekly to prevent draft accumulation.
- Discarding via `moveToTrash` is reversible - the draft can be recovered from trash if needed.
