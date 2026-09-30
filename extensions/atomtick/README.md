# AtomTick

NTP-synchronized atomic reference time for Raycast — a live analog clock face with a digital readout underneath.

## Why

There is no official REST API that serves "atomic time in seconds." The correct way to get a trustworthy reference time is NTP. AtomTick queries `time.nist.gov` (falling back to `pool.ntp.org`), measures the offset between your system clock and the NTP reference using the standard four-timestamp NTP algorithm, caches that offset, and ticks locally from there — no polling loop hitting the network every second.

## Commands

**Analog Clock** — a live analog watch face (rendered as SVG) with a centered digital `HH:MM:SS` caption, both corrected for the NTP offset. Drift, NTP server, and last-sync metadata sit alongside the face; use **Resync Now** to force a fresh query. Sync failures show a Toast and fall back to the system clock.

**Copy Atomic Time** — ensures an NTP offset is available, then copies the current atomic instant to the clipboard as an ISO-8601 UTC timestamp (HUD shows the local digital readout as well).

Both commands follow your system timezone by default. To preview a different zone, set an IANA timezone (e.g. `Europe/Berlin`) in the extension preferences (`Timezone Override`); leave it empty to keep following the system.

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
