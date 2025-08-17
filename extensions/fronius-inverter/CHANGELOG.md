# Changelog

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