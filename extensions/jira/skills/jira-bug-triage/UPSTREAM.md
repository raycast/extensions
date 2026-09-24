# Upstream sources

This skill adapts [Atlassian's public Triage Issue skill](https://github.com/atlassian/atlassian-mcp-server/blob/eb9a5956a7ac6380c731c725a8382da53ad6d980/skills/triage-issue/SKILL.md), revision `eb9a5956a7ac6380c731c725a8382da53ad6d980`, reviewed on September 24, 2026. The upstream [Apache 2.0 license](https://github.com/atlassian/atlassian-mcp-server/blob/eb9a5956a7ac6380c731c725a8382da53ad6d980/LICENSE), including Atlassian's copyright notice, is retained in [LICENSE](LICENSE).

## Guidance retained

- Extract distinctive errors, context, and user-visible symptoms before searching.
- Search from several angles and include resolved reports when considering regressions.
- Compare detailed evidence before classifying duplicate candidates.
- Draft a specific bug summary and preserve supplied reproduction, environment, and impact details.

## Changes for Raycast

The adaptation uses the extension's 11 registered tools and their exact inputs. All 11 files in `src/tools/` and the manifest were reviewed; [TOOLS.md](TOOLS.md) lists their inputs. It omits upstream MCP discovery/execution commands and does not install a separate integration.

`search-issues` accepts only `jql`. Its implementation requests at most 50 issues, returns fixed summary fields, and discards pagination metadata. Detailed candidates must be read through `get-issue`. The skill states bounded search coverage rather than claiming a complete duplicate audit. Project, user, and label lists also expose no pagination inputs.

Duplicate detection is an assessment. The extension has no registered comment, issue-link, priority, or transition tools. The upstream comment branch is therefore omitted; a user-requested description edit uses `update-issue` and preserves the existing report. Related issue references in a description are not formal Jira links. Numeric match percentages and assumptions that the current assignee authored a fix are also omitted.

The create tool cannot submit parent, priority, component, version, team, custom-field, or attachment fields, even though some underlying API helpers support them. It cannot fill unsupported required fields after a create error. Creation, editing, and assignment require their declared `confirmation` objects; assignee omission on assignment unassigns the issue. Optional create fields remain unset unless requested, matching the existing manifest instructions.

`update-issue` wraps `withAccessToken(jira)` directly, while the other tools select OAuth or configured API-token authentication through `withJiraCredentials`. This is a pre-existing limitation. The skill requires known OAuth use for edits, stops the API-token edit path, and does not change credentials or source code. Runtime testing must check this behavior with the public API.

Descriptions are written as Markdown converted to ADF, replacing the whole field. The skill stops edits that cannot preserve existing rich content. Read/search tools do not attach a browser URL; creation does. Links therefore use a returned URL or a site already known from the user's input or returned data, never an invented tenant hostname or an API URL presented as an issue page.

## Validation

The public API dependency and lockfile now target 2.5.0. See [validation results](VALIDATION.md) for checks completed after release. These prompts are a future manual test plan, not executed transcripts:

1. "Triage this Mobile bug: login times out on iOS 18 when switching from Wi-Fi to cellular. Check open and resolved reports for duplicates, and show the evidence without changing anything."
2. "File the checkout error we discussed as a Payments bug if no matching report is found. Use my supplied reproduction steps and assign it to me; leave other optional fields unset."
3. "I use Jira through OAuth. Add these new reproduction details to the description of MOB-163, preserving its existing content and labels. Then verify the update."
