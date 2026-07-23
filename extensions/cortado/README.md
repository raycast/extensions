# Cortado

Keep your PC from sleeping, indefinitely or on a timer, using [PowerToys Awake](https://learn.microsoft.com/en-us/windows/powertoys/awake) — right from Raycast.

## Requires PowerToys

Cortado doesn't prevent sleep itself; it drives the Awake module in [Microsoft PowerToys](https://learn.microsoft.com/en-us/windows/powertoys/install). Before Cortado can do anything, you need:

1. **PowerToys installed.**
2. **The Awake module enabled** — PowerToys Settings → Awake → toggle it on.
3. **Awake started at least once** — opening PowerToys Settings → Awake is enough; that creates PowerToys Awake's own settings file, which is what Cortado reads and writes.

If any of these aren't true, Cortado's commands will tell you exactly which one, rather than failing silently.

## Commands

- **Toggle Awake** — turns Awake off if it's currently on; otherwise turns it on, either indefinitely or for your Default Duration, depending on the Toggle Behavior preference. Assign it a hotkey for a one-key coffee toggle. Its subtitle always reads "Cortado" — for live state, see Awake Status below.
- **Keep Awake for…** — pick a specific duration (15 minutes to 8 hours) and start a timed Awake session that counts down accurately. Its subtitle also always reads "Cortado."
- **Awake Status** — the *only* command with a live subtitle. It keeps itself in sync with the current state (`Off`, `Awake`, `Awake · 2h left`, `Awake · timed`, or `Unavailable` when PowerToys Awake can't be reached) so you can see whether you're awake without running anything, in the Raycast root list. **Open this command once after installing** — Raycast's background refresh is opt-in per install and only starts after a command has been run manually once (or enabled in its preferences).

Only Awake Status shows live state, deliberately — `updateCommandMetadata` can only ever update the subtitle of the command that's currently running, so if Toggle Awake or Keep Awake for… tried to show state too, it would go stale the moment either one finished and start contradicting Awake Status's subtitle.

### Why some sessions show "Awake · timed" instead of a countdown

`Awake · 2h left`-style countdowns only appear for sessions Cortado itself starts. PowerToys Awake has two different "on for a while" modes: a **Timed** mode (used by Awake's own tray shortcuts, e.g. right-click → "1 hour") where Awake tracks the countdown only in its own running process — never on disk — so there's no way for Cortado to recover how much time is left; and an **Expirable** mode (an absolute end time), which *is* stored on disk and can be read back accurately at any moment. Cortado always uses Expirable mode for its own timed sessions specifically so the countdown is real. If you start a timed session from the PowerToys tray instead, Awake Status will honestly show `Awake · timed` rather than fabricate a number it can't verify.

## Preferences

- **Default Duration** — prefills Keep Awake for…, and is what Toggle Awake uses when Toggle Behavior is set to "For the Default Duration".
- **Keep display on** — prevents the display from turning off while keep-awake is active; maps to Awake's own display setting.
- **Toggle Behavior** — whether Toggle Awake keeps your PC awake indefinitely or for your Default Duration.

## How it works

Cortado reads and writes PowerToys Awake's own settings file directly (`%LOCALAPPDATA%\Microsoft\PowerToys\Awake\settings.json`), the same file the PowerToys Settings UI and Awake's tray icon use. Awake watches that file live, so changes made here, from the PowerToys tray, or by Awake's own timers all stay in sync — Cortado always re-reads the file immediately before acting, rather than trusting cached state.

### A note on status accuracy

Awake Status's background refresh (the tick that runs every minute on its own) intentionally skips one of the two checks Toggle Awake and Keep Awake for… always run: it doesn't verify `PowerToys.Awake.exe` is actually still alive, only that PowerToys Awake is enabled and its settings file is readable. That's a deliberate cost tradeoff — checking the live process every tick would mean spawning a process every minute, all day. The practical effect: if PowerToys Awake is killed or crashes mid-session, the subtitle can keep showing the last known state (e.g. "Awake") for up to a minute before the next check catches it. Any real action — running Toggle Awake or Keep Awake for… — always re-verifies fully before doing anything, so this staleness window only affects the passive display, never whether your PC actually stays awake.
