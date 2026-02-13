# Bed Time Calculator Changelog

## [Enhanced UI] - 2026-02-13

### New Features
- **Color-coded sleep quality indicators**: Visual quality labels (Optimal, Great, Good, Light, Nap) with color-coded icons (Star/Circle)
- **Improved time formatting**: Durations displayed in readable "Xh Ym" format
- **Copy to clipboard**: Quickly copy times or full details to clipboard
- **Show More toggle**: Option to reveal additional shorter sleep cycles (2, 1 cycles)
- **Natural language time parsing**: Supports flexible input like "7am", "noon", "midnight", "half past 7" via chrono-node
- **Enhanced UI**: Modern List-based interface with visual indicators instead of plain text

### Technical
- Added chrono-node dependency for natural time parsing
- New sleep-utils.ts library with shared utilities
- Upgraded command interfaces to use Raycast List components

## [Initial Version] - 2024-06-01
- Initial version