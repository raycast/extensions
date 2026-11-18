# AWX Deploy Changelog

## [Unified Template Search and Launch Prompts] - 2026-10-27

- **Search Templates** now lists workflows and job templates together, and search matches both. The type dropdown is gone.
- **Launch with Variables…** now asks for the job type (Run / Check), limit, job tags and skip tags when the template has "Prompt on launch" enabled for them, prefilled with the template's defaults.

## [Initial Version] - 2026-08-05

- **Search Templates** command: paginated, filterable browser for workflows and job templates, with launch, launch-with-variables (survey-aware), and view-stages actions.
- **Running Jobs** command: live, auto-refreshing view of active jobs with open-in-AWX and cancel actions.
- **Workflow History** command: workflows run in the last 7 days grouped by template, with per-workflow and per-stage timing stats, success rates, and usage breakdowns.
- Configuration via AWX URL + API token preferences.
