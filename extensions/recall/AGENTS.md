# AGENTS.md

Guidance for agents working in this repository (a Raycast extension for [Recall](https://www.recall.it)).

## Project

- Raycast extension (React + TypeScript), scaffolded via Raycast's Create Extension
- Talks to the read-only Recall API (`https://backend.getrecall.ai/api/v1`, Bearer auth with an `sk_` key)
- Docs: [Raycast API](https://developers.raycast.com), [Recall API](https://docs.recall.it/developer/api)

## Agent skills

### Issue tracker

Issues live in GitHub Issues (`Dedsecproject/recall`, via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.
