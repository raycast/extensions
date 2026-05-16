---
name: batch-draft-writer
description: Generate drafts across many threads from one set of instructions.
tools_used:
  - list_threads
  - query_email_and_calendar
  - create_or_update_draft
read_only: false
upstream: https://raw.githubusercontent.com/superhuman/mcp-mail/main/skills/batch-draft-writer/SKILL.md
upstream_sha: ""
---

# Batch Draft Writer

Generate drafts across multiple threads from a single set of instructions — backlog triage, templated follow-ups, "circle back" sweeps.

## Inputs from the user

- A filter that identifies which threads to draft against. Examples:
  - "every unread thread from a customer in the last 14 days"
  - "every thread where I replied last and they haven't responded in 7+ days"
  - "every thread labeled `followup` from this quarter"
- Per-thread instructions in natural language. Examples:
  - "Politely check in, reference what they asked, and offer a 15-minute call."
  - "Send a one-line 'just bumping this' nudge."
  - "Thank them for the meeting and recap the three decisions we made."

## Steps

1. **Identify the threads.**
   - If the filter is structured (labels, dates, flags), use `list_threads`.
   - If the filter is semantic ("everyone who asked about pricing"), use `query_email_and_calendar`.
   - Show the user the matched list (≤ 25 threads) BEFORE drafting. Ask for confirmation.

2. **For each thread, draft a reply.** Call `create_or_update_draft` with:
   - `type: "reply"`
   - `thread_id`: the matched thread
   - `instructions`: the per-thread instructions from the user, optionally personalized using context from the thread (e.g. the recipient's first name, the subject)
   - Leave `body` empty — let Superhuman's AI writer compose in the user's voice.

3. **Summarize the run.** Report:
   - Count of drafts created.
   - List of `(thread_id, recipient, subject)` entries with the draft id.
   - Any threads that failed to draft and why.

## Rules

- Write skill: gated by read-only mode. If read-only is on, stop and tell the user.
- Always confirm the matched thread list before creating any drafts. The user must be able to deselect.
- Never send. This skill only drafts. The user reviews each draft in Superhuman and sends manually.
- Cap a single run at 25 threads. For larger backlogs, ask the user to narrow the filter.
- If the user's instructions reference specific facts (a deadline, a price), pass those through verbatim — do not paraphrase the substance.
