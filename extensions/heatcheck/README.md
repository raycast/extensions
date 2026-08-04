# Heat Check

Shows what's burning your CPU and spinning your fan on macOS.

Two commands:

| Command | Description |
|---------|-------------|
| `Heat Check` | A one-line verdict, then live temperatures (CPU, GPU, SSD, battery), per-fan speeds, CPU load, power, and memory pressure, with the top processes by CPU. Kill or copy any process inline. |
| `Heat Check: AI Diagnosis` | The same snapshot, explained by Raycast AI in plain English. |

## Prerequisites

The AI Diagnosis command needs Raycast Pro. Heat Check runs without it.

## Sensor data and iSMC

Temperatures and fan speeds come from [iSMC](https://github.com/dkorunic/iSMC), a third-party GPL-3.0 sensor CLI. Heat Check does not bundle it. On first run it downloads a pinned release (`v0.16.5`) from iSMC's GitHub, checks the download against a SHA256 hash baked into the source, and caches the binary under the extension's support directory. Reading the sensors runs that binary as a separate process.

If the download fails or the sensors can't be read, temperatures and fan speeds show as unavailable and the rest (processes, CPU load, memory pressure) keeps working.

## Installation

```bash
git clone <repo-url>
cd heatcheck
npm install
npm run dev
```

## Development

```bash
npm run dev      # Watch mode (ray develop)
npm run build    # Production build
npm run lint     # Lint
```

## License

MIT — see [LICENSE](LICENSE).

---

Author: kumamaki · v0.1.0
