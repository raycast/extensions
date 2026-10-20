# Upstream sources

This skill adapts guidance from [Exa Labs' agent skills](https://github.com/exa-labs/agent-skills), revision `975171aac8d40e713fbcc5637bf64972378a3617`, reviewed on September 24, 2026.

| Public skill | Guidance used here |
| --- | --- |
| [exa-search](https://github.com/exa-labs/agent-skills/blob/975171aac8d40e713fbcc5637bf64972378a3617/skills/exa-search/SKILL.md) | Start with ordinary search, use deeper search for complex questions, and screen highlights before reading full content. |
| [exa-contents](https://github.com/exa-labs/agent-skills/blob/975171aac8d40e713fbcc5637bf64972378a3617/skills/exa-contents/SKILL.md) | Read known URLs directly, choose one extraction mode, and check per-URL statuses for partial failures. |
| [build-with-exa](https://github.com/exa-labs/agent-skills/blob/975171aac8d40e713fbcc5637bf64972378a3617/skills/build-with-exa/SKILL.md) | Keep requests small and add filters only when the user's constraints require them. |

The adaptation uses the extension's existing `search`, `search-deep`, `get-contents`, `get-answer`, and `get-code-context` tools. Their implemented inputs take precedence over the broader upstream API examples. Raw HTTP, SDK setup, additional search types, streaming, structured extraction, date filters, and freshness controls are outside this skill's scope. The local search tools discard `excludeDomains` for `company`, so the skill follows that restriction even though upstream search documentation describes broader support.

The upstream [company-research](https://github.com/exa-labs/agent-skills/blob/975171aac8d40e713fbcc5637bf64972378a3617/skills/company-research/SKILL.md) and [lead-generation](https://github.com/exa-labs/agent-skills/blob/975171aac8d40e713fbcc5637bf64972378a3617/skills/lead-generation/SKILL.md) workflows depend on `agent_run` and additional tools that this extension does not provide. They are not bundled here.

The upstream MIT copyright notice and license are retained in [LICENSE](LICENSE).

## Public API validation

See [validation results](VALIDATION.md) for checks after the API 2.5.0 update.
