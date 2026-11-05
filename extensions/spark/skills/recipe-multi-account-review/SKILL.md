---
name: recipe-multi-account-review
description: >-
  Review inbox status across multiple email accounts with per-account
  breakdown and cross-account priorities.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: read-only
---

# Recipe: Multi-Account Review

For users with multiple email accounts, review each account's inbox status and present a unified summary with per-account breakdown.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** read-only.

## Steps

### Step 1: Discover all accounts

```
accounts {}
```

Note each account email, its access level, and associated calendars and teams.

### Step 2: Check folders per account

For each account, see the folder structure and message counts:

```
folders { "account": "user@work.com" }
folders { "account": "user@personal.com" }
folders { "account": "user@sideproject.com" }
```

### Step 3: Review unread mail per account

For each account, check unread across key categories:

```
emails { "folder": "user@work.com", "filter": "is:unread" }
emails { "folder": "user@personal.com", "filter": "is:unread" }
emails { "folder": "user@sideproject.com", "filter": "is:unread" }
```

For a category-level breakdown on the most active account:

```
emails { "folder": "user@work.com", "filter": "category:priority is:unread" }
emails { "folder": "user@work.com", "filter": "category:personal is:unread" }
```

### Step 4: Cross-account priority check

Check priority mail across all accounts at once:

```
emails { "folder": "Inbox", "filter": "category:priority is:unread" }
```

This uses the unified inbox to surface priority items regardless of which account received them.

### Step 5: Present the summary

Report per account:
- **work@company.com:** N unread (X priority, Y people)
- **personal@gmail.com:** M unread
- **side@project.com:** K unread

Highlight cross-account priorities and any account that needs immediate attention.

## Tips

- Start with `accounts` to discover all configured accounts and their access levels.
- The unified inbox (`emails` on `Inbox`) aggregates across all accounts - use it for cross-account priority checks.
- Per-account browsing (`emails` on `user@example.com`) keeps things separated when the user wants to focus on one context.
- Use `folders` with `account` to understand each account's folder structure before browsing specific folders.
- Some accounts may be read-only while others have triage access. `accounts` shows the access level for each.
- For users with work + personal accounts, suggest processing them separately to maintain mental context.
- Combine with `recipe-inbox-by-category` for a deep dive into the most active account.
