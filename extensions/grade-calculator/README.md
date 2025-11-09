# Grade Calculator

A comprehensive Raycast extension for tracking classes, assignments, and calculating grades with quarter and semester averages.

## Features

### Class Management
- Create and manage multiple classes
- Assign class types (Academic, Honors, AP) with custom weighting
- Track current quarter for each class
- View quarter and semester grades at a glance

### Assignment Tracking
- Add assignments with grades (0-100%)
- Classify assignments as Major or Minor
- Assignments automatically organized by type and quarter
- Full CRUD functionality for all assignments

### Grade Calculations
- Weighted grade calculations based on class type
  - **Academic**: 50% Major, 50% Minor
  - **Honors**: 60% Major, 40% Minor
  - **AP**: 70% Major, 30% Minor
- Quarter grades calculated from assignments in that quarter
- **Manual Quarter Grades**: Set a fixed grade for a quarter (useful for past quarters)
  - Manual grades override calculated grades from assignments
  - Indicated with a "Manual" badge
  - Can be edited or cleared to return to calculated grades
- Semester grades calculated as 50% Q1 + 50% Q2

### Projected Grade Calculator
- Test "what-if" scenarios without changing actual data
- Modify existing assignment grades temporarily
- Add hypothetical future assignments
- See real-time impact on quarter and semester grades
- Reset button to return to actual grades

### Settings
- Create custom class types with your own weighting rules
- Edit or delete existing class types
- Weights must add up to 100%

## Usage

1. **Launch the extension**: Search for "Grade Calculator" in Raycast
2. **Add your first class**: Use the "Add Class" action
3. **Open a class**: View all assignments and grades for that class
4. **Add assignments**: Add assignments with grades and classify as Major or Minor
5. **Set manual quarter grade**: If a quarter has already passed, you can set the final grade directly instead of entering individual assignments
   - Click on the "Current Quarter Grade" item
   - Select "Set Manual Grade" to enter the grade
   - The grade will be marked with a "Manual" badge
   - Use "Clear Manual Grade" to return to calculated grades
6. **Project grades**: Use the "Project Grade" action to test what-if scenarios
7. **Customize settings**: Create custom class types with your own weighting rules

## Keyboard Shortcuts

- `Cmd + E` - Edit selected item
- `Ctrl + X` - Delete selected item
- `Cmd + T` - Toggle quarter view (in class detail)
- `Cmd + Shift + T` - Switch current quarter (in class detail)
- `Cmd + Shift + P` - Open projected grade calculator (in class detail)
- `Cmd + Shift + ,` - Open settings
- `Cmd + R` - Reset projections (in project grade view)
- `Cmd + N` - Add new item (context-dependent)

## How Grades are Calculated

**Quarter Grade** = (Average of Major Assignments × Major Weight) + (Average of Minor Assignments × Minor Weight)

**Semester Grade** = (Q1 Grade × 0.5) + (Q2 Grade × 0.5)

## Data Storage

All data is stored locally on your device using Raycast's LocalStorage API. Your data is private and never leaves your computer.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```
