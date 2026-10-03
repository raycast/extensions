# Validation

Validated on 2026-10-03, on an Apple M4 Max Mac with three displays:
Studio Display (main), built-in Retina display, and Mi Monitor (rotated 270°).

## Passed

- TypeScript strict type checking and Prettier formatting.
- 12 controller tests: on/off round trip, last-active-display protection,
  duplicate names, disconnected displays, invalid IDs, malformed/duplicate
  backend records, mirrors, enable-all recovery, state verification,
  idempotency, and topology changes between reads.
- Swift helper compilation for arm64 and x86_64, with ad-hoc code signing.
- Raycast CLI production build for all three commands.
- Built-in display disabled and re-enabled with live macOS state readback.
- Mi Monitor disabled and re-enabled with live macOS state readback.
- Both displays remained listed as Off across separate helper processes;
  re-enabling restored their original logical resolution. System Information
  confirmed the Mi Monitor retained 270° rotation and all three were online.
- Tinycast folder import: Display Switch appears installed with 3 commands.
- Tinycast Toggle Displays renders the three real display names and state.
- Enter on the built-in display turns it Off in the launcher and native inventory;
  Enter again turns it On. No dependency on BetterDisplay or displayplacer.

## Boundaries

The first hardware probe revealed that public online inventory loses disabled
screens. Recovery was fixed by persisting the numeric display identity before
mutating, flushing it to disk, and checking the full SkyLight inventory. The
corrected same-process and separate-process off/on tests both passed.

Intel helper was compiled but not executed on an Intel Mac. Raycast 2.6.2 was installed from the official Raycast download for the store
submission. Its distribution build was run in the launcher, the built-in display
was toggled Off and On with Enter, and both states were confirmed in Raycast
and by native inventory readback. All displays were restored to On.
End-to-end execution was also tested in Tinycast.
Physical unplug/replug while a screen is disabled, lid-close transitions,
WindowServer restart, and different monitor models were not tested.

The local linker emits a missing Homebrew libxc search-path warning inherited
from this machine's toolchain. Both helper binaries compile, sign, and the arm64
helper executes successfully; Display Switch does not use libxc.

To repeat a hardware test, run `node scripts/verify-hardware.mjs DISPLAY_UUID`.
It briefly disables the selected display, checks that a new process still lists
it, and always attempts restoration in a finally block. Choose a secondary
screen and keep another screen active.

## PR review regressions

- Injected missing-UUID inventory entry: valid displays remain discoverable;
  the unidentified display is excluded from targeting, without changing the
  full native inventory used for last-display protection.
- Injected failures at layout begin, resolution, origin, and completion:
  each returns valid JSON with enabled=true and a layout warning.
- Controller regression confirms set and enable-all accept the confirmed On
  state alongside a warning; non-string warnings remain invalid.
- After rebuilding both helpers, live inventory returned the built-in display
  as On. The hardware test stopped before mutation because only one display
  was connected; a new physical off/on cycle was not performed.
- The list refreshes from macOS even after a failed command, to avoid stale state.

UUID failure and layout-error cases were injected in native tests; these were
not induced on physical hardware.
