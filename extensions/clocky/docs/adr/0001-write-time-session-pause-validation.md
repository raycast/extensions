# Write-time Session/Pause validation

Session and Pause overlaps are rejected at the point data is written in Adjust Entries, rather than merged or deduped when totals are computed at read time (`getDaySummary`, `getSessionSlicesForDay`, `sumPauses`, `getWorkAndBreak`). Those read-time functions clip and sum session/pause ranges independently with no overlap handling, so an overlapping Session would double-count worked time and an overlapping Pause would double-subtract break time. Rejecting the write is the last point where the ambiguity — which range is "right"? — can still be resolved, keeping every read-time consumer working from data that's already valid.

## Considered Options

- **Read-time merging/deduping of overlapping intervals**: rejected. Every read-time consumer would need its own reconciliation logic, risking disagreement between consumers on how to merge the same overlap, and it would hide that an invalid write was ever allowed.
- **Write-time validation** (chosen): a single rejection point in Adjust Entries keeps invalid ranges out of storage entirely, so read-time code never needs overlap-handling logic.

## Consequences

Sessions/Pauses that are already overlapping in a user's existing local storage are not migrated or repaired — this validation only prevents new invalid data going forward. Read-time code will still double-count any pre-existing corruption. This is acceptable because the extension has not yet shipped to the Store.
