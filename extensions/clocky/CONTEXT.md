# Clocky

Clocky is a Raycast extension for tracking worked time and breaks by clocking in and out.

## Language

**Session**:
A clocked-in period with a `start` and optional `end`. Open when `end` is unset, closed otherwise. An open Session's missing `end` is treated as "now" whenever it's compared against another time range.
_Avoid_: Shift, entry, clock-in

**valid Session**:
A Session that does not overlap any other Session in time, regardless of whether that other Session is open or closed.

**Pause**:
A break within a single Session, with its own `start` and optional `end`, open and closed by the same rule as a Session.
_Avoid_: Break (in code; fine in prose)

**valid Pause**:
A Pause that falls entirely within its own Session's start/end, and does not overlap any other Pause on the same Session.
