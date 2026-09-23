# Finder-native undo

Craft issue: `1SS-325` (`8766f0a4-8513-3d91-8a75-5a41c44aa5ba`)

## Outcome

Moves and copies initiated by Finder File Actions on macOS are performed by Finder, so Finder can expose them through its native Undo command.

## Scope

- Add a Finder operation adapter for batched move and copy commands.
- Use Finder-backed operations from the Move to Folder and Copy to Folder flows.
- Preserve existing collision confirmation and result reporting.
- Fail explicitly when Finder cannot perform an operation so native undo is never silently lost.
- Add unit tests for routing, AppleScript escaping, and failure behavior.

## Proof of done

- Finder shows an Undo Move or Undo Copy action after a successful FFA operation.
- Command-Z in Finder reverses the operation in a disposable test fixture.
- `bun run lint`, `bun test`, and `bun run build` pass.

## Notes

- Finder undo is Finder-scoped and temporary, not a global system undo stack.
- Runtime proof: the development command moved a selected file to Desktop, Finder exposed `Undo Move of “runtime-test.txt”`, and one Command-Z restored it.
- Batched move and copy operations each produce one Finder undo entry.
- Finder undo restores the moved source after an overwrite, but does not restore the replaced destination item. The confirmation and result toast disclose this limitation.
- Cross-volume behavior remains unverified.
