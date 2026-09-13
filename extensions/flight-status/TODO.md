# TODO

## Phase 0: Project Management Setup

- [x] Create TODO.md
- [x] Create CHANGELOG.md
- [x] Create docs/LEARNINGS.md

## Phase 1: Scaffold

- [x] Create package.json (Raycast manifest, dependencies, preferences)
- [x] Create tsconfig.json
- [x] Create assets/command-icon.png
- [x] Create src/types.ts (TypeScript interfaces)
- [x] Create src/flight-status.tsx stub
- [x] npm install

## Phase 2: Data Layer

- [x] Create src/data/airline-codes.ts (IATA → ICAO mapping)
- [x] Create src/api/opensky.ts (OpenSky Network API client)
- [x] Create src/api/airlabs.ts (Airlabs API client)

## Phase 3: Business Logic

- [x] Create src/utils/flight-phase.ts (flight phase derivation)
- [x] Create src/utils/eta.ts (ETA calculation with Haversine)
- [x] Create src/utils/format.ts (display formatting helpers)

## Phase 4: Main Command

- [x] Implement src/flight-status.tsx (full menu bar command)

## Phase 5: Verify & Polish

- [x] Lint + build
- [x] Manual testing

## Post-launch Enhancements

- [x] Integrate Airlabs schedules endpoint for airline-provided ETA
- [x] Display gate, terminal, and baggage info in dropdown menu
- [x] FlightAware AeroAPI integration for predictive ETA and diversion detection
- [x] ADSB.lol as fallback data source when OpenSky returns no data
- [x] "Set Flight" command with colored status icons
- [x] Customizable menu bar display preferences (icon, flight number, status, ETA)
- [x] Phase-aware menu bar icons with color coding per flight phase
- [x] Refactor ETA-display logic: extract `isAirborne(phase)` predicate and consolidate into the `else if (!isLoading)` branch, removing a redundant expiry re-check and unused import
- [x] Centralize unit conversions into `src/utils/units.ts` and adopt native `Intl.NumberFormat` for altitude/heading formatting
- [x] Simplify airline-code reverse lookup with a precomputed `ICAO_TO_IATA` map
- [x] Dedupe arrival-time math (`effectiveArrivalMs`) and ETA formatting; extract `refreshMenuBar()` in `set-flight.tsx`

## Code Review Fixes (#1–#15)

- [x] Guard API-client fetch + JSON parsing via shared `fetchJson()` to preserve the OpenSky → ADSB.lol fallback (#1)
- [x] Handle null OpenSky callsign without crashing (#2)
- [x] Stabilize `fetchData` identity (ref) to stop the double fetch; refetch after a reset (#3, #19)
- [x] Stop manual Refresh from bypassing the in-flight mutex (#4)
- [x] Validate Airlabs airport coordinates to avoid a NaN ETA (#5)
- [x] Derive altitude trend from the prior sample (fix Climbing-while-descending) (#6)
- [x] Prevent the schedule-expiry reset↔refetch loop (airborne + `!isLoading` gating + arrTs latch) (#7)
- [x] Treat a null phase as not-airborne so ETA isn't shown for "Not Active" (#8)
- [x] Prioritize FA override over expiry in icon and status text (#9)
- [x] Reject bare airline codes and normalize whitespace (#10)
- [x] Guard ADSB.lol altitude against non-numeric `alt_baro` (#11)
- [x] Reject implausibly low and non-finite ground speeds in ETA (#12)
- [x] Treat the American "Canceled" spelling as cancelled (#13)
- [x] Show scheduled arrival in the destination airport's timezone (#14)
- [x] Clamp negative `formatEta` output (#15)

## Follow-ups

- [x] Infer ADSB.lol ground state from a low ground speed when `alt_baro` is absent, so a missing altitude isn't defaulted to airborne (#31)
- [x] Make the ETA model continuous and monotonic in distance (removed the 10,000 ft shortcut and the 80 nm boundary jump) (#12)
- [x] Extract `deriveMenuBarDisplay()` from `flight-status.tsx` to make the render logic unit-testable

The remaining `flight-status.tsx` complexity is the fetch/effect/ref choreography (`isFetching` + `latest` + `lastResetArrTs` + `needsReset` gating), which is inherently React-effect and left in the component.

## Future Ideas

- [ ] Push notifications for flight phase changes (departure, landing, diversion)
- [ ] Multi-flight tracking (watch multiple flights simultaneously)
- [ ] Historical flight log (persist past tracked flights)
- [ ] Departure/arrival airport weather in dropdown menu
- [ ] Publish to Raycast Store
