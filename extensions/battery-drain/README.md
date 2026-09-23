# Battery Drain

Find out why your MacBook battery drained: how many watts it draws, runaway processes, what keeps it from sleeping and how to stop it, and why charging stopped.

- **Menu bar:** how many watts the whole Mac draws, measured live, which neither macOS nor Activity Monitor shows (Activity Monitor only has a unitless energy score). Its chip icon is the same as on the Now row in Diagnose Battery Drain. The menu shows battery time left and drain (and, while charging, what the charger delivers), energy impact by app, and what is keeping the Mac awake.
- **Diagnose Battery Drain:** live watts every 5 seconds with a chart of the last two hours, CPU by app and by process (top five at 2% or more) with runaway detection ("99% CPU for 22h"), sleep blockers such as `caffeinate` or Handoff together with the app that started them, a plain-language charging state, and battery health. Processes, sleep blockers and their starters can be terminated from here.
- **Sleep blockers:** see which apps keep the Mac from sleeping (`caffeinate`, Handoff, a video call), which app started them, and end them from Diagnose Battery Drain, with a confirmation first.
- **Notifications:** a macOS notification once for each runaway process (can be turned off).

No `sudo`, no background daemon, no network access. Data comes from `ioreg`, `pmset`, `top` and `ps`, and live watts from the Mac's System Management Controller (SMC), read by a small bundled Swift helper that needs no administrator rights.

## Compatibility

- **Apple Silicon MacBooks:** everything, tested on an M5 Pro on battery and on the adapter.
- **Intel MacBooks:** everything, with the system draw and the adapter's input read live from SMC, on battery and on the adapter. Should SMC be unreadable, the draw on battery falls back to the battery's volts × amps (marked "estimated"), and on the adapter only the power it negotiated with the Mac is known (e.g. 94 W from a 140 W charger).
- **Desktop Macs** (no battery): apps, processes, runaway detection and sleep blockers, and the system draw where SMC reports it; no battery.

Intel support was checked against real readings from an Intel MacBook Pro on macOS 13, running Raycast 1.104; desktop Macs are not yet tested.

SMC keys are undocumented and differ between models, so each reading is checked: a key that is missing, zero, negative or above 1000 W is ignored and the macOS battery telemetry is used instead. The system draw is `PSTR`; the adapter's input is `PDTR` on Apple Silicon and `PD0R` on Intel. On the Intel MacBook, adapter input minus what went into the battery matched `PSTR` to within 0.1 W. On Apple Silicon, macOS's own once-a-minute readings are copies of these keys: `SystemLoad` equalled `PSTR` and `SystemPowerIn` matched `PDTR` to within 0.5 W, on battery and on the adapter.

## What the numbers mean

- **Watts** are the whole system's power draw, measured live: every 5 seconds in Diagnose Battery Drain, and every two minutes and on each menu open in the menu bar. The footer shows when the latest reading was taken. Without SMC, macOS refreshes this reading only about once a minute. On the adapter, the adapter's own input is shown next to it; the difference is roughly what goes into the battery.
- **Charts** redraw every 15 seconds, with the process list; the readings in between are not lost, they appear on the next redraw. A ring on the line marks the peak and its value. Where nothing was measured for more than 10 minutes (sleep, or the menu bar not running), a faint dashed line without fill bridges the gap. App and process charts show 0 where a process was not among the ten using the most energy, which is all the history keeps per sample. The chart combines the menu bar's history with the live readings taken while Diagnose Battery Drain is open.
- **Rows** show CPU as a share of one core, colored green, yellow or orange by level; red is kept for runaway processes. "+GPU/wakeups" marks a row whose energy impact clearly exceeds its CPU: it costs battery in other ways too.
- **Energy impact** is Activity Monitor's relative score for a process. It has no unit and is not watts; higher means the process costs more battery. CPU is shown next to it as a percentage of one core. Apps add up their helper processes; system processes (such as WindowServer) and command-line tools are listed under Processes only.
- **Battery drain** is how many percent of charge the battery loses per hour, measured over the time the Mac was awake on battery.
- **History** (the two-hour chart, battery drain, and runaways caught over time) is recorded by the menu bar command. With it turned off, Diagnose Battery Drain still works, but its chart covers only the time it is open and drain shows "—". The menu's Battery tooltip names the processes with the most energy impact over the last 30 minutes.

## macOS quirks you may notice

These come from how macOS and the hardware report power, not from the extension:

- **Watts jump around.** Live readings follow every burst of activity: opening an app can take an idle MacBook from 8 W to 20 W for a second. The chart and the average smooth this out.
- **Watts change only once a minute** on a Mac where SMC cannot be read: macOS refreshes its own reading about every 60 seconds, so the value holds still in between. The footer and the menu show the time of the last measurement.
- **"– W" right after unplugging** (without SMC). When the charger is disconnected, macOS resets its readings to zero until the next refresh, up to a minute later. A running Mac never draws 0 W, so Battery Drain shows "– W" instead and keeps the zero out of the history and charts.
- **Odd readings right after plugging in.** At the moment a charger connects, macOS can report an impossible value for a single reading. Battery Drain ignores readings that are negative or above 1000 W.
- **Charging stops at 80%.** With a charge limit or Optimized Charging on, macOS pauses charging on purpose; the Now row shows a pause icon, and hovering it explains why.
- **Temperature is not shown** on macOS versions that do not expose it.

## When the Now icon changes color

This applies to the chip icon on the Now row in Diagnose Battery Drain; it is green when all is well. The menu bar icon keeps the menu bar's own color: there, a runaway process shows as a warning inside the menu and as a notification.

- **Orange:** three consecutive readings at or above the high-draw threshold (25 W by default), or the same process at an energy impact of 50 or more for three samples in a row. A single spike does not count.
- **Red:** a process has held at least 80% of a CPU core for 15 minutes or more, either observed by the menu bar or inferred from its total CPU time since it started.

## Preferences

| Preference                             | Default |
| -------------------------------------- | ------- |
| Runaway CPU (%)                        | 80      |
| Runaway Duration (minutes)             | 15      |
| High Power Draw (W)                    | 25      |
| Notify when a runaway process is found | on      |

Invalid or empty values fall back to the defaults.

## Terminating processes

Only processes owned by you can be terminated, never `launchd`, `WindowServer`, `kernel_task` or `loginwindow`. Every termination asks for confirmation and checks that the process really exited. Before a signal is sent, the process is looked up again, so a pid reused by another process in the meantime is left alone. The process that started a sleep blocker can be terminated too: this ends that app without its usual quit, so unsaved documents are lost, and for a command-line tool the confirmation warns that it ends the terminal session. A command typed in a terminal names the terminal as where it started, but the terminal itself is never offered for termination, since that would close every session in it.

## Cost of watching

Diagnose Battery Drain reads the power every 5 seconds, which takes a few milliseconds. Processes are sampled every 15 seconds: `top` needs about a second of CPU to measure them, and sampling them every 5 seconds added about 2 W on an Intel MacBook. Charts redraw at the same 15-second pace, since Raycast 1.x blanks a chart for a moment each time it redraws. The menu bar collects every two minutes, and whenever its menu is opened.

## Development

`npm run dev` and `npm run build` compile the Swift helper in `swift/` into a universal (Apple Silicon and Intel) binary, which needs Xcode 16.3 or later. `npm test` runs without Xcode.
