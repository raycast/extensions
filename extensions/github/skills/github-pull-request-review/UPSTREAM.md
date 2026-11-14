# Public skill research

Reviewed on September 24, 2026.

Researched [Anthropic’s public code-review command](https://github.com/anthropics/claude-code/blob/d78be9481b889e11186ec4578b4f5e9301396e25/plugins/code-review/commands/code-review.md), pinned at `d78be9481b889e11186ec4578b4f5e9301396e25`. It depends on shell access, repository files, agents, and posting tools absent from this extension. Its repository license reserves rights under commercial terms, so no source text is copied or bundled. The local skill is an original workflow based on the inspected Raycast tool implementations.

[TOOLS.md](TOOLS.md) lists every registered tool and its inputs. The skill does not install CLIs or add tools. Existing manifest instructions and evals are preserved.

## Validation

The public API is now 2.5.0. See [validation results](VALIDATION.md) for build, lint, test, and Raycast runtime status.

These are realistic manual scenarios, not executed transcripts:

1. Review PR #123 in owner/repo for concrete bugs and summarize its workflow status.
2. Review a PR whose diff includes a binary file and a patch truncated after 400 lines; explain the coverage gaps.
3. Review PR #123 in owner/repo, post your findings, and approve it if it looks good.
