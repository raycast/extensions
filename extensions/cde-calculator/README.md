# CDE Calculator

A Raycast extension to calculate the new Current Development Estimate (CDE) based on time spent.

## Usage

1. Select your current development estimate (CDE) as text in any application (e.g., select "0.78")
2. Run the command with the following argument:
   - `timeSpent` - Time spent on the project in HH:MM format (e.g., 0:35 for 0 hours and 35 minutes)

The extension will calculate the new CDE by subtracting the time spent from the original estimate. The result is automatically copied to your clipboard.

### Example

Input:

- Selected text: 0.78
- Time Spent: 0:28 (0 hours and 28 minutes)

Output:

- New CDE: 0.5 (copied to clipboard)
# cde-calculator
