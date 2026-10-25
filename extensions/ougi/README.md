# Ougi

Every temperature sensor and fan in your Mac, with manual fan control and overheat protection.

## Setup

Ougi talks to the Mac's System Management Controller through [ougi](https://github.com/arturious/ougi), a small
open-source command-line tool built from source by Homebrew.

1. Install the tool — temperatures and fan speeds work right away:

   ```sh
   brew install arturious/tap/ougi
   ```

2. To control the fans, install its root daemon once (changing fan speed requires root):

   ```sh
   sudo ougi daemon install
   ```

The extension shows these commands, with a copy button, whenever a step is missing.

## Commands

- **Show Fans & Temperatures** — fans with speed and mode, and every temperature sensor grouped by CPU, GPU,
  SoC, memory, storage, battery and more. Set all fans to Auto, Max, a percentage or an exact RPM.
- **Toggle Fans Auto/Max** — switches all fans between automatic control and full speed. Handy on a hotkey.

## Overheat protection

If fans are below max under manual control and any CPU or GPU sensor reaches 95 °C, the daemon returns the fans
to macOS. Fans also return to automatic control whenever the daemon stops.

## Uninstall

```sh
sudo ougi daemon uninstall
brew uninstall ougi
```
