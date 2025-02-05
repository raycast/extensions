# Fronius Inverter

A Raycast extension to monitor your Fronius Gen24 inverter in realtime. This extension provides a unified dashboard that displays detailed inverter information and key system metrics. In addition, it includes a background menu‑bar command ("Inverter Watch") that continuously monitors for errors and allows you to quickly open the full dashboard.

## Features

- **Realtime Dashboard**  
  - View detailed inverter info (custom names, operating state, PV power, error codes) in a clean list view.
  - Check key system metrics including total energy (converted from Wh to kWh), PV power, load power, grid power, battery power, battery charge (SOC), autonomy, self‑consumption, backup mode, and battery standby.
  - Data is auto‑refreshed every 60 seconds with an option for manual refresh.

- **Inverter Watch (Menu Bar)**  
  - Runs in the menu bar, polling every 30 seconds for inverter errors.
  - Displays a badge with a warning emoji and error count if errors exist, or a green check if all is OK.
  - Tap “Show Dashboard” to quickly open the full dashboard view.

- **Localization**  
  - Supports English, Deutsch, Français, and Español via a dropdown in the extension preferences.
