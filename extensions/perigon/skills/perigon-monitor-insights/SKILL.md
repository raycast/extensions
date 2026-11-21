---
name: perigon-monitor-insights
description: List and inspect Perigon monitors, read events and briefings, and analyze monitor output with Signal Insights (export, Python, charts). Use when the user asks about their monitors, monitor events, newsletters, signal analysis, or charts from monitoring data.
---

Use this skill for **configured monitors** and **Signal Insights** analysis. News-wide search without a monitor belongs in the perigon-news-research skill.

## Session setup

1. Call `get_api_access` once per session (and after 403) to confirm monitor and insights access. Use only tools registered in the current session; documented monitor or Insights tools may be unavailable because of permissions or tool selection.
2. Call `signal_insights_create_workspace` **once** at the start of any conversation that will use export, code, shell, or file tools. Pass the returned workspace id to every subsequent Signal Insights tool.
3. For chart formatting rules, read MCP resource `perigon://reference/charts` before calling `signal_insights_preview_chart`.

## Monitors (read and lifecycle)

1. `list_monitors` to discover monitors; filter by name, status, or type when the user specifies.
2. Use the returned monitor UUID, not its display name, for follow-up calls. `get_monitor` for full configuration before explaining what a monitor tracks. Schedule `hour` / `minute` are wall-clock times in `timezoneId`, matching Delivery settings in the product — do not treat `hour` as UTC.
3. By monitor type:
   - **EVENT / MENTIONS:** `get_monitor_events` for structured events, summaries, entities, and related articles.
   - **TOPIC:** `get_monitor_newsletters` for scheduled briefings; `get_monitor_summaries` for rolling AI summary history.
4. **Mutations:** Only call `set_monitor_status`, `create_monitor`, or `update_monitor` when the user explicitly requests a status change or new/updated monitor. Default new monitors to **DRAFT** unless they ask to activate. **Archived** monitors cannot be restored via the public API—confirm before archiving. `create_monitor` is in the default session. `update_monitor` is not; reconnect with `?tools=all` or `?tools=monitoring` to edit an existing monitor. EVENT and MENTIONS schemas need `eventType`; the server adds a required string field when it is omitted.

## Signal Insights analysis

1. `signal_insights_search_signals` → `signal_insights_read_signal` to pick a signal and read `classificationType` (**EVENT**, **MENTIONS**, or **TOPIC**).
2. Branch on classification:
   - **EVENT / MENTIONS:** `signal_insights_export_events` (structured query, not raw SQL) → `signal_insights_execute_code` (pandas) → optional `signal_insights_preview_chart` for visualization.
   - **TOPIC:** `signal_insights_list_newsletters` → `signal_insights_read_newsletter` for full markdown content.
3. Save user-facing deliverables under `artifacts/output/` in the workspace. Exports land under `artifacts/` automatically.
4. After a sandbox restart, the workspace id remains valid; Python kernel state resets but persisted files under `artifacts/` remain.

## File and shell tools

Use `signal_insights_list_files`, `signal_insights_read_file`, `signal_insights_write_file`, `signal_insights_grep`, `signal_insights_str_replace`, and `signal_insights_shell` only within the active workspace for analysis workflows. Do not treat workspace paths as public URLs.

## Output

- For monitor listings, show name, type, status, and id (uuid) the user can refer to later.
- For events and newsletters, summarize themes and cite linked articles when present.
- For analysis, show key numbers or chart takeaways and note filters, date range, and signal name.

## When to stop or ask

- Ask which monitor or signal if several match the description.
- Ask before create/update/archive monitor operations.
- Do not invent events, newsletter text, or chart data not returned by tools.
