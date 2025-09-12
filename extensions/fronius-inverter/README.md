# Fronius Inverter

A Raycast extension to monitor your Fronius Gen24 inverter in realtime. This extension provides a unified dashboard that displays detailed inverter information and important system metrics. In addition, it includes a background menu‑bar command ("Inverter Watch") that continuously monitors for errors and allows you to quickly open the full dashboard.

## Features

- **Realtime Dashboard**  
  - View detailed inverter info (custom names, operating state, PV power, error codes) in a clean list view.
  - Check key system metrics including total energy (converted from Wh to kWh), PV power, load power, grid power, battery power, battery charge (SOC), autonomy, self‑consumption, backup mode, and battery standby.
  - Data can be manually refreshed.

- **Inverter Watch (Menu Bar)**  
  - Runs in the menu bar, polling every 30 seconds for inverter errors.
  - Displays a badge with a warning emoji and error count if errors exist, or a green check if all is OK.
  - Tap "Show Dashboard" to quickly open the full dashboard view.

- **AI-Powered Insights**
  - **System Analysis**: Get intelligent insights about your current system state, including production efficiency, consumption patterns, and energy flow observations.
  - **Error Explanation**: When errors occur, receive detailed explanations of what the error codes mean, potential causes, and recommended troubleshooting steps.
  - **Optimization Suggestions**: Receive practical recommendations to optimize your solar system's performance based on real-time data.
  - All AI features use real-time data directly from your Fronius inverter for accurate and relevant insights.

## Requirements

- Fronius Gen24 inverter with accessible API on your local network
- Raycast Pro subscription (for AI features)

## Configuration

In the extension preferences, set the base URL of your Fronius inverter (e.g., http://192.168.0.75).
