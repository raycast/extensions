# Changelog

## [Expanded Monitoring and Reliability] - 2026-09-16

- Added connection state to the menu bar so an unreachable inverter is no longer shown as healthy.
- Added a connection-test command and a read-only status tool for Raycast AI.
- Added API-version discovery and capability-aware reads for inverter energy, Smart Meter, storage, and Ohmpilot data.
- Added day and year energy plus battery-charge fallbacks for GEN24 responses that omit those fields from power flow.
- Added dedicated dashboard and menu-bar sections for live power, energy, battery, Smart Meter, Ohmpilot, and API state.
- Kept the core dashboard working when an optional endpoint fails and exposed the missing source under Partial Data.
- Added AI instructions and evals that require live data and prohibit invented diagnoses, forecasts, or trend claims.
- Added request timeouts, URL normalization, API-status validation, and clearer failures.
- Paced realtime requests to the Solar API's documented one-request-per-second limit.
- Prevented overlapping refreshes and kept malformed URLs from crashing error views.
- Added dashboard refresh and direct access to the inverter web interface.
- Preserved signs for bidirectional power-flow values and handled missing battery fields.
- Kept Ohmpilot component readings separate from the device-level energy total when API identifiers differ.
- Distinguished connected PV capacity from current production.
- Added live-device checks and regression tests.
- Updated Raycast, React, TypeScript, ESLint, and test dependencies.

## [Initial Release] - 2025-03-03

- **Unified Dashboard:**
  - Combined inverter info and system overview into one intuitive dashboard command.
  - Energy values (Wh) are converted to kWh; negative values (e.g., battery power) are displayed as positive.
  - Inverter info section now shows each inverter's custom name, operating state, PV power, and error codes.

- **Menu Bar Watch:**
  - Added a background menu bar command that polls for inverter errors every 30 seconds.
  - Displays a badge with a warning and error count if errors exist, or a green check when all is OK.
  - Includes actions to manually refresh data and to open the full dashboard.

- **Battery Charge Status:**
  - Included battery charging status (StateOfCharge_Relative) in both the dashboard and watch commands.
  - Displayed as a percentage with localized labeling.

- **Code Improvements:**
  - Replaced explicit `any` types with `unknown` in catch blocks.
  - Fixed type mapping issues and ensured proper access to inverter properties.
