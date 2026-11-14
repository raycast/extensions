# Fronius Inverter

Monitor a Fronius Gen24 inverter over the local Fronius Solar API v1. Requests go directly from Raycast to the configured inverter URL.

## Commands

- **Fronius Dashboard** shows inverter state, live power, day/year/total energy, Smart Meter values, battery details, Ohmpilot data, and API compatibility.
- **Inverter Watch** shows current PV power in the menu bar and marks inverter errors or connection failures.
- **Test Fronius Connection** checks both API endpoints and reports whether current data can be read.

The extension also provides a read-only Raycast AI tool for current inverter, Smart Meter, battery, Ohmpilot, and site status. The AI instructions require a fresh status call and prohibit invented error meanings, forecasts, or trend claims from one snapshot. The extension does not change inverter settings.

Power-flow values keep the sign returned by the inverter. The extension fills GEN24 day and year energy from `GetInverterRealtimeData.cgi` because those fields are normally empty in the power-flow response. It also reads battery charge from `GetStorageRealtimeData.cgi` when the power-flow response omits it.

The inverter list labels `PVPower` from `GetInverterInfo.cgi` as connected PV capacity. Current production always comes from the site power-flow response.

Optional endpoint failures do not take down the dashboard. They appear under **Partial Data**, while inverter state and power flow remain available.

Snapshot reads are paced to the Solar API's documented limit of one request per second.

## Setup

Enter the inverter base URL in the extension preferences, including the scheme. Example: `http://192.168.1.100`.

The Fronius Solar API v1 must be enabled and reachable from the Mac running Raycast.

## Development

```bash
npm ci
npm test
FRONIUS_BASE_URL=http://192.168.1.100 npm run test:live
npm run check
```

The live test only reads the Solar API. It checks API discovery, inverter state and energy, power flow, Smart Meter, storage, and Ohmpilot endpoints.

## License

MIT
