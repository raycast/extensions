# Adderall

Keep your Mac awake — even with the lid closed — straight from Raycast.

Powered by the [`adderall`](https://github.com/Carlos-err406/adderall) CLI
(`caffeinate` + `pmset disablesleep`). **Install the CLI first:**

```sh
brew install carlos-err406/tap/adderall
adderall setup
```

## Commands

- **Adderall On** — keep the Mac awake (no timer).
- **Adderall Off** — restore normal sleep.
- **Adderall On with Timer** — pick a duration (`15m` / `30m` / `1h` / `2h` / `4h` /
  `8h`, or type a custom one like `90s`); sleep is auto-restored when the timer fires.

> ⚠️ While on, your Mac won't sleep with the lid shut — keep it on a ventilated
> surface, or use a timer so it can't be left on by accident.
