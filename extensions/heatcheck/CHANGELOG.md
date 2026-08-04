# Heat Check Changelog

## [Initial Version] - 2026-07-06

- Heat Check command: a one-line verdict, live temperatures (CPU, GPU, SSD, battery), per-fan speeds with effort against each fan's rated max, CPU load, power state, and memory pressure
- Top processes by CPU share, with inline actions to kill (SIGTERM/SIGKILL) or copy PID/name
- Auto-refresh every 4 seconds
- AI Diagnosis command: the same snapshot explained in plain English by Raycast AI (requires Raycast Pro)
- Sensor data from iSMC, downloaded on first run from its GitHub release and verified against a pinned SHA256
