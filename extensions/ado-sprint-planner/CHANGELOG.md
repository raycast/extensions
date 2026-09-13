# Azure DevOps Sprint Planner Changelog

## [Initial Release] - {PR_MERGE_DATE}

- **My Sprint** — current-iteration work items grouped To-Do / Done by a personal 3-stage local status, with your own done/total in the title and a muted, view-only ADO-state tag per row. Multi-team support.
- **My Tickets** — every open work item assigned to you across the project, grouped by iteration, with a collapsible Deferred shelf.
- **Plan Sprint** — a rolling day-by-day projection across the sprint's remaining working days, with a fit summary and an explicit "At risk of spillover" bucket. Deterministic sequencing by default, optional Auto (AI) sequencing via a Gemini key (order only — capacity, fit, and spillover stay deterministic). Optionally plans your other open tickets (backlog) behind the sprint block.
- **Today's To-Do** — the first day's slice of the projection; unfinished work automatically rolls into today.
- **Sprint Glance** — a menu-bar count of what's left today.
- Open-only fetching via ADO state categories (closed/resolved/removed work is filtered out), with a configurable list of extra states to keep visible.
