# Mac Fan Control

Read and force **Apple Silicon** fan speed straight from Raycast. Live RPM, control mode and
CPU/GPU temperature, plus one-keystroke maximum or automatic.

Raycast talks to the SMC through [`fan_control`](https://github.com/triuzzi/macos-fan-control),
a small open-source C core (MIT) that speaks a documented CLI + JSON contract. The extension
itself has no SMC knowledge — it renders what the core reports.

> **Requires an Apple Silicon Mac.** Intel Macs expose fan keys in a different format and are
> not supported.

## Setup

Run **Set Up Fan Control** from Raycast and approve the administrator prompt once — Touch ID
works. It installs the helper the extension ships with, plus the single rule it needs:

- `/usr/local/bin/fan_control` — the helper, owned by `root:wheel`, mode `0755`
- `/etc/sudoers.d/macos-fan-control` — `<you> ALL=(root) NOPASSWD: /usr/local/bin/fan_control`,
  validated with `visudo` before it is written

That rule lets the extension change fan speed **without a password prompt**. It is scoped to
that single binary, which lives in a root-only-writable directory, so no user process can swap
the binary and inherit root — the setup checks both before writing the rule. Reading fan speed
needs no privileges at all.

Every command that needs the helper offers the same setup action when it is missing.

Remove everything with:

```sh
sudo rm /etc/sudoers.d/macos-fan-control /usr/local/bin/fan_control
```

## Commands

| Command | What it does |
|---|---|
| **Set Up Fan Control** | Install or repair the helper and its passwordless write rule with one administrator prompt. |
| **Fan Status** | Live actual RPM, load, target, hardware range, mode, and rolled-up CPU/GPU temperatures. Actions to cool until below a temperature, arm a thermal trigger, force maximum or restore automatic, showing any active cooldown or trigger. |
| **Set Fan Speed** | Force every fan to 100/85/70/55/40/25/0% of its own hardware range, with the resulting RPM previewed. Settings below 50% ask for confirmation. |
| **Cool Until Below** | Hold a speed (maximum by default, pick it from a dropdown) until the hottest sensor drops below a chosen temperature, then release the fans to firmware. Runs in the background; a new speed, `auto` or another cooldown replaces it. |
| **Thermal Trigger** | Arm a hysteresis thermostat: pick the sensor (hottest die, CPU or GPU), the temperature that spins the fans up, the speed to hold and the temperature that releases them. It keeps cycling in the background until replaced or cancelled. |
| **Set Fans to Maximum** | Force maximum speed — assign a hotkey. |
| **Set Fans to Automatic** | Hand every fan back to SMC firmware control — assign a hotkey. |
| **Fan Menu Bar** | Current RPM in the menu bar, kept live while the menu is open, with fan detail, temperatures, any active cooldown or trigger, and quick actions. |

## Notes

The SMC honours a forced target even when its own thermal demand is higher, so low settings
really do reduce cooling — that is why the low presets confirm first. Forced mode is volatile:
a reboot hands every fan back to the firmware. The C core also ships a thermal `guard` that
restores automatic control above a temperature ceiling, a `cool` cooldown that holds a speed
until the dies drop below a threshold, and a `trigger` thermostat that spins the fans up at one
temperature and releases them below another. All three live in the core, so the extension just
renders their state.

## Troubleshooting

- **"fan_control is not installed"** — run **Set Up Fan Control**.
- **"sudo needs a password, the NOPASSWD rule is missing"** — run **Set Up Fan Control** to
  rewrite the rule (for example after renaming your macOS user).
- **No fans listed** — the machine is not Apple Silicon, or no fans are present.

## License

MIT
