---
name: recipe-label-organize
description: >-
  Organize emails with labels and folders: attach labels, detach wrong ones,
  and move misfiled emails.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: triage
---

# Recipe: Label & Folder Organize

Organize emails using labels and folders. Attach project labels, detach incorrect ones, and move misfiled emails to the right location.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** triage.

## Steps

### Step 1: Review current folder and label structure

```
folders {}
```

For a specific account:

```
folders { "account": "user@example.com" }
```

Note the existing labels and their message counts. Identify labels that are empty or no longer relevant.

### Step 2: Identify emails that need labeling

Search for project-related or topic-related emails that should be labeled:

```
search { "query": "project name" }
emails { "filter": "from:client@company.com newer_than:30d" }
```

### Step 3: Attach labels

Add a label to an email without removing it from its current location:

```
action { "action_name": "attachLabel", "message_ids": ["<id>"], "folder": "user@example.com:ProjectAlpha" }
```

Label multiple emails in a batch:

```
action { "action_name": "attachLabel", "message_ids": ["<id1>"], "folder": "user@example.com:ProjectAlpha" }
action { "action_name": "attachLabel", "message_ids": ["<id2>"], "folder": "user@example.com:ProjectAlpha" }
```

### Step 4: Detach incorrect labels

Remove a label that was applied incorrectly:

```
action { "action_name": "detachLabel", "message_ids": ["<id>"], "folder": "user@example.com:WrongLabel" }
```

### Step 5: Move misfiled emails

Move emails to the correct folder:

```
action { "action_name": "moveToFolder", "message_ids": ["<id>"], "folder": "user@example.com:Projects" }
```

### Step 6: Verify

Browse the organized label to confirm the right emails are there:

```
emails { "folder": "user@example.com:ProjectAlpha" }
```

## Tips

- Use `folders` to discover the exact qualified names for labels (e.g., `user@gmail.com:MyLabel`).
- `attachLabel` adds a label without moving the email - the email stays in its current folder too. This is how Gmail labels work.
- `detachLabel` removes a label without moving the email elsewhere.
- `moveToFolder` physically moves the email to a different folder - use this for IMAP-style organization.
- For Gmail accounts, prefer `attachLabel`/`detachLabel` over `moveToFolder` since Gmail uses labels rather than folders.
- Shared inbox labels use the format `shared@company.com:LabelName` or `"Team Name:LabelName"`.
- Combine with `recipe-meeting-prep` or project tracking workflows to label threads as part of a larger process.
- Run this recipe periodically to keep project labels current as new related emails arrive.
