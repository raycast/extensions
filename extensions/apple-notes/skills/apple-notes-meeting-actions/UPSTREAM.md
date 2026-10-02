# Public skill research

Reviewed on September 24, 2026.

Researched [OpenClaw’s apple-notes skill](https://github.com/openclaw/openclaw/blob/aeb32f35468d556c909fbacff3aca550cb01cdd9/skills/apple-notes/SKILL.md), pinned at `aeb32f35468d556c909fbacff3aca550cb01cdd9`, and its MIT license. It relies on the `memo` CLI and interactive editors. Those commands are not registered Raycast tools. No upstream text or executable is bundled; the local meeting/review workflow is original and uses the existing extension tools.

[TOOLS.md](TOOLS.md) lists every registered tool and its inputs. The skill does not install CLIs or add tools. Existing manifest instructions and evals are preserved.

## Validation

The public API is now 2.5.0. See [validation results](VALIDATION.md) for build, lint, test, and Raycast runtime status.

These are realistic manual scenarios, not executed transcripts:

1. Review the Product Sync note from September 22 and extract decisions, owners, and deadlines. Do not save anything.
2. Append only the new action items from the supplied meeting notes to Weekly Actions, preserving existing content.
3. Create reminders for every action in the Launch Review note.
