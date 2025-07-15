# Days Left - Raycast Extension

A Raycast extension that tracks days gone since a past date and shows progress bars for future goals with rewards.

## Features

### 📅 Days Gone Tracking

- Shows how many days have passed since a customizable start date
- Displays the start date in a readable format
- Updates automatically each day

### 🎯 Future Goals & Progress

- **First Milestone (7 days)**: July 20, 2025 - Treat yourself to a nice dinner 🍽️
- **Second Milestone (14 days)**: July 27, 2025 - Buy that book you've been wanting 📚
- **Third Milestone (1 month)**: August 12, 2025 - Get a massage or spa day 💆‍♀️
- **Final Goal (2 months)**: September 11, 2025 - Big reward: Plan a weekend trip! ✈️

### 📊 Progress Visualization

- Visual progress bars for each goal
- Percentage completion tracking
- Days remaining until each milestone
- Status indicators (In Progress, Completed, Overdue)

### 🎁 Reward System

- Mark goals as completed when you reach them
- Claim rewards with celebration toasts
- Track overall completion percentage

### 💾 Data Persistence

- Progress is automatically saved using Raycast's Cache API
- Data persists between sessions and app restarts
- Automatic completion status updates based on current date
- Cache management tools (reset progress, clear cache)

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Open Raycast and search for "Days Left"

## Development

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

## Customization

### Changing the Start Date

The extension uses a default start date of January 1, 2024. You can modify this in the code by changing the `startDate` in `src/days-left.tsx`.

### Modifying Goals

To change the goals, edit the `initialGoals` array in `src/days-left.tsx`. Each goal has:

- `id`: Unique identifier
- `title`: Display name
- `targetDate`: Target completion date
- `reward`: Description of the reward
- `completed`: Completion status

### Base Date

The goals are calculated relative to July 13, 2025. You can change this by modifying the `baseDate` variable.

## Usage

1. **View Days Gone**: The extension shows how many days have passed since your start date
2. **Track Progress**: See progress bars for each future goal
3. **Mark Completion**: When you reach a goal, mark it as completed
4. **Claim Rewards**: Celebrate your achievements by claiming rewards
5. **Monitor Overall Progress**: View your overall completion percentage
6. **Manage Data**: Use the action panel to reset progress or clear cache data

## Screenshots

The extension displays:

- Days gone since start date
- Progress bars for each goal
- Days remaining until each milestone
- Reward descriptions
- Overall completion summary

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - see LICENSE file for details.
