# Hakuna API Constraints

Hidden constraints not documented in the official API docs, discovered through usage.

## Timers

- **A timer cannot be edited in place.** To change the task, project, start time, or note of a running timer, you must stop/delete it and start a new one. There is no PATCH endpoint for the timer.

## Time Entries

- **Entries cannot overlap a running timer.** If a timer is running (started at time T on date D), no time entry on date D may have a `start_time >= T` or an `end_time > T`. The API will reject such requests. Validate client-side before submitting.
