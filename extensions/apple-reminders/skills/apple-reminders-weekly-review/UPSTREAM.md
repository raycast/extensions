# Public skill research

Reviewed on September 24, 2026.

Researched [OpenClaw’s apple-reminders skill](https://github.com/openclaw/openclaw/blob/aeb32f35468d556c909fbacff3aca550cb01cdd9/skills/apple-reminders/SKILL.md), pinned at `aeb32f35468d556c909fbacff3aca550cb01cdd9`, and its MIT license. It relies on the `remindctl` CLI and additional list-management commands. Those commands are not registered Raycast tools. No upstream text or executable is bundled; the local meeting/review workflow is original and uses the existing extension tools.

[TOOLS.md](TOOLS.md) lists every registered tool and its inputs. The skill does not install CLIs or add tools. Existing manifest instructions and evals are preserved.

## Validation

The public API is now 2.5.0. See [validation results](VALIDATION.md) for build, lint, test, and Raycast runtime status.

These are realistic manual scenarios, not executed transcripts:

1. Review my Work list for last week and suggest priorities for next week. Do not change reminders.
2. Capture these in my Backlog list: prepare onboarding questions; review the launch brief. Neither has a deadline.
3. Move all overdue reminders to a new list called Next Week and assign them to Morgan.
