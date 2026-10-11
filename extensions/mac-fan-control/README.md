# Mac Fan Control

Read and force **Apple Silicon** fan speed straight from Raycast. Live RPM, control mode and
CPU/GPU temperature, plus one-keystroke maximum or automatic.

Raycast talks to the SMC through [`fan_control`](https://github.com/triuzzi/macos-fan-control),
a small open-source C core (MIT) that speaks a documented CLI + JSON contract. The extension
itself has no SMC knowledge — it renders what the core reports.

> **Requires an Apple Silicon Mac.** Intel Macs expose fan keys in a different format and are
> not supported.

## Setup

The core must be installed once, root-owned, before the extension can read or write fans.
Reading fan speed needs no privileges, but changing it writes SMC keys and requires root.

```sh
git clone https://github.com/triuzzi/macos-fan-control.git
cd macos-fan-control
sudo ./scripts/install.sh
```

`install.sh` builds the C core, installs it as `/usr/local/bin/fan_control`
(`root:wheel 0755`), and adds one scoped sudoers rule:

```
<you> ALL=(root) NOPASSWD: /usr/local/bin/fan_control
```

That rule lets the extension change fan speed **without a password prompt**. It is scoped to
that single binary, which lives in a root-only-writable directory, so no user process can swap
the binary and inherit root — the installer verifies both before writing the rule and validates
it with `visudo` first.

Remove everything with:

```sh
sudo rm /etc/sudoers.d/macos-fan-control /usr/local/bin/fan_control
```

## Commands

| Command | What it does |
|---|---|
| **Fan Status** | Live actual RPM, load, target, hardware range, mode, and rolled-up CPU/GPU temperatures. Actions to force maximum or restore automatic. |
| **Set Fan Speed** | Force every fan to 100/85/70/55/40/25/0% of its own hardware range, with the resulting RPM previewed. Settings below 50% ask for confirmation. |
| **Set Fans to Maximum** | Force maximum speed — assign a hotkey. |
| **Set Fans to Automatic** | Hand every fan back to SMC firmware control — assign a hotkey. |
| **Fan Menu Bar** | Current RPM in the menu bar, refreshed every minute, with fan detail, temperatures and quick actions. |

## Notes

The SMC honours a forced target even when its own thermal demand is higher, so low settings
really do reduce cooling — that is why the low presets confirm first. Forced mode is volatile:
a reboot hands every fan back to the firmware. The C core also ships a thermal `guard` that
restores automatic control above a temperature ceiling.

## Troubleshooting

- **"fan_control is not installed"** — run the setup above.
- **"sudo needs a password, the NOPASSWD rule is missing"** — re-run `sudo ./scripts/install.sh`
  from the repo.
- **No fans listed** — the machine is not Apple Silicon, or no fans are present.

## License

MIT
