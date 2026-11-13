# Upstream sources

This skill adapts public skills from [Google Workspace CLI](https://github.com/googleworkspace/cli), revision `a3768d0e82ad83cca2da97724e46bea4ff0e6dbd`, reviewed on September 24, 2026:

- [Plan Your Weekly Google Calendar Schedule](https://github.com/googleworkspace/cli/blob/a3768d0e82ad83cca2da97724e46bea4ff0e6dbd/skills/recipe-plan-weekly-schedule/SKILL.md): review the agenda, check availability, add requested events, and review the updated schedule.
- [Find Free Time Across Calendars](https://github.com/googleworkspace/cli/blob/a3768d0e82ad83cca2da97724e46bea4ff0e6dbd/skills/recipe-find-free-time/SKILL.md): check availability across participants before scheduling a meeting.
- [Calendar Agenda](https://github.com/googleworkspace/cli/blob/a3768d0e82ad83cca2da97724e46bea4ff0e6dbd/skills/gws-calendar-agenda/SKILL.md): make the calendar scope, date range, and time zone explicit.

The upstream [Apache 2.0 license](https://github.com/googleworkspace/cli/blob/a3768d0e82ad83cca2da97724e46bea4ff0e6dbd/LICENSE) is retained in [LICENSE](LICENSE). The skill is a modified adaptation, with CLI commands and installation prerequisites replaced by this extension's existing tools.

## Changes for Raycast

The workflow follows `ai.yaml`: `get-current-time` resolves relative dates, `suggest-time` finds slots, and `create-event` books structured events. It adds explicit calendar discovery, event pagination, occurrence-aware agenda deduplication, availability validation, and verification after writes. Suggestions remain in chat unless the user requests bookings.

The upstream agenda command searches all calendars by default. This adaptation states a narrower default scope of the primary and selected, non-hidden calendars. `search-events` reads one calendar at a time and excludes primary-calendar birthdays by default. `suggest-time` and `check-availability` include the current user plus explicit email addresses, not every calendar discovered by `list-calendars`. Secondary calendar email IDs must be supplied as availability inputs without being copied into event invitations. The skill reports a gap for required non-email IDs rather than constructing a free/busy API call.

`suggest-time` returns the first bounded set of candidates, which can overlap and cluster on one day; proposals are not reservations. The skill queries days separately for weekly blocks, filters overlapping proposals, and checks each slot before writing. `check-availability` exposes per-calendar errors and busy periods, allowing missing or unreadable results to remain unknown. Neither tool supplies other participants' preferred work hours, and availability checks are not atomic reservations.

All 23 files in `src/tools/` and the manifest were reviewed. [TOOLS.md](TOOLS.md) lists all 23 registered tools and their inputs. No tools, dependencies, or existing AI instructions were changed.

## Validation

The public API dependency and lockfile now target 2.5.0. See [validation results](VALIDATION.md) for checks completed after release. These prompts are a future manual test plan, not executed transcripts:

1. "Plan next week across my Work and Personal calendars. Fit in three 90-minute focus blocks between 9 and 5, with 15-minute buffers. Show the plan first."
2. "Find three 45-minute slots with Maya Chen and Alex Patel next Tuesday through Thursday, between 10 and 4 in Europe/London. Don't send invitations yet."
3. "Book the Tuesday 10:00 focus block from that plan on my Work calendar, then show me the updated Tuesday schedule."
