# AtomTick

NTP-synchronized atomic reference time for Raycast — a live analog clock face with a digital readout underneath.

## Why

There is no official REST API that serves "atomic time in seconds." The correct way to get a trustworthy reference time is NTP. AtomTick queries `time.nist.gov` (falling back to `pool.ntp.org`), measures the offset between your system clock and the NTP reference using the standard four-timestamp NTP algorithm, caches that offset, and ticks locally from there — no polling loop hitting the network every second.

## Command

**Analog Clock** — a live analog watch face (rendered as SVG) with a centered digital `HH:MM:SS` caption, both corrected for the NTP offset.

It automatically follows your Mac's current system timezone — no configuration needed, and switching timezones (manually or automatically) takes effect immediately. If you need to preview a different timezone regardless of your Mac's setting, set an IANA timezone (e.g. `Europe/Berlin`) in the extension's preferences (`Timezone Override`); leave it empty to keep following the system.

## How the offset is calculated

AtomTick sends a minimal SNTP request over UDP (`node:dgram`) and applies the standard NTP offset formula using all four timestamps (client send, server receive, server transmit, client receive), which cancels out most of the network round-trip delay:

```
offset = ((T2 - T1) + (T3 - T4)) / 2
```

The result is cached and reused for up to 6 hours before a fresh sync is triggered automatically. You can always force a resync via the "Resync Now" action.

## Development

```bash
npm install
npm run dev     # ray develop
npm run lint
npm run build
```

## License

MIT
