# Camper-Calc

**Camper Van Cost Calculator for Raycast**

Calculate the real cost of your camper van per day of use – including residual value, yearly breakdown, and category analysis.

![Camper-Calc](metadata/camper-calc-1.png)

---

## Features

### Track Expenses
Log all costs related to your camper van by year and category:

| Category | Examples |
|---|---|
| Purchase | Buying price |
| Additional Equipment | Awning, bike rack |
| Maintenance | Oil change, filters |
| Vehicle Inspection | MOT / annual inspection |
| Repair | Accident damage, breakdowns |
| Tires | Summer / winter tires |
| Pitch / Campsite | Campground fees, seasonal pitch |
| Fuel | Petrol or diesel costs |
| Garage | Winter storage |
| Insurance | Vehicle insurance |
| Residual Value | Current or expected resale value |
| Other | Everything else |

### Usage Days
Record how many days per year you actually used the camper van.

### Profitability Calculation
- **Gross Expenses** – Sum of all costs excluding residual value
- **Residual Value** – Current or expected resale value (deducted from costs)
- **Net Depreciation** – True cost (Gross − Residual Value)
- **Total Usage Days** – All recorded days across all years
- **Cost per Day** – Net Depreciation divided by total usage days

### Yearly Overview
Shows expenses, usage days, and cost per day for each year at a glance.

### Category Breakdown
Sorted list of all categories with amounts and their percentage share of total costs.

---

## Data Management

| Action | Description |
|---|---|
| Export CSV | Exports all expenses and usage days as CSV to the clipboard (compatible with Numbers and Excel) |
| Export JSON | Full data backup as JSON to the clipboard |
| Import JSON | Restores data from a JSON backup in the clipboard |
| Delete All Data | Resets everything to the initial state (requires confirmation) |

---

## How to Use

1. Open Raycast and search for **Camper-Calc**
2. Add your expenses via **Add New Expense**
3. Enter usage days per year via **Add Usage Days**
4. The **Profitability** section immediately shows your cost per day

### Tips
- Update the **Residual Value** regularly to keep the calculation realistic
- Always create a **JSON backup** before deleting all data
- The **CSV export** is great for further analysis in a spreadsheet app

---

## Data Storage

All data is stored locally in Raycast's `LocalStorage`. No data is sent to any external server.

---

## Author

**wdeu** · License: MIT
