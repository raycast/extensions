# Time Calculator for Raycast - Project Plan

## Overview
A Raycast extension that allows users to calculate total hours from multiple time entries, supporting both HH:MM and decimal format.

## Features

### 1. Time Entry Management
- **Initial Rows**: Start with 10 empty time entry rows
- **Dynamic Rows**: "Add More Lines" button to add 5 more rows at a time
- **Two Input Formats**:
  - Time format: HH:MM (e.g., 8:30)
  - Decimal format: XX.XXX (e.g., 8.5)

### 2. Calculation Features
- **Real-time Calculation**: Update total as user types
- **Smart Parsing**: Automatically detect format (HH:MM vs decimal)
- **Error Handling**: Validate inputs and show clear error messages
- **Empty Row Handling**: Skip empty rows in calculations

### 3. Display Options
- **Total Display**: Show result in both formats
  - Time format: HH:MM
  - Decimal format: XX.XXX
- **Visual Feedback**: Highlight invalid entries

### 4. Actions
- **Calculate**: Recalculate total (automatic on input change)
- **Clear**: Reset all entries to empty
- **Copy Total**: Copy total to clipboard (both formats)

## Technical Architecture

### Components Structure
```
src/
├── calculate-time.tsx      # Main command component
├── components/
│   ├── TimeEntryRow.tsx   # Individual time entry row
│   ├── TotalDisplay.tsx   # Total display component
│   └── ActionButtons.tsx  # Action buttons component
├── utils/
│   ├── timeParser.ts      # Parse and validate time inputs
│   ├── timeCalculator.ts  # Calculate totals
│   └── timeFormatter.ts   # Format time for display
└── types/
    └── index.ts           # TypeScript type definitions
```

### State Management
- Use React hooks (useState) for managing:
  - Array of time entries
  - Total time (in minutes)
  - Error states
  - Number of visible rows

### Data Flow
1. User enters time in any row
2. onChange triggers validation and parsing
3. Valid entries are converted to minutes
4. Total is calculated and displayed in both formats
5. Invalid entries show error state

## Implementation Details

### Time Entry Component
```typescript
interface TimeEntry {
  id: string;
  value: string;
  minutes: number | null;
  isValid: boolean;
  errorMessage?: string;
}
```

### Parsing Logic
1. Detect format by checking for ":" character
2. For HH:MM format:
   - Split by ":"
   - Validate hours (0-23) and minutes (0-59)
   - Convert to total minutes
3. For decimal format:
   - Parse as float
   - Convert to minutes (multiply by 60)
   - Round to nearest minute

### Calculation Logic
1. Filter out invalid and empty entries
2. Sum all valid minute values
3. Convert back to both display formats

### UI/UX Considerations
- Use Raycast's Form component for input
- Implement debouncing for real-time calculation
- Show placeholder text: "0:00" for time format
- Provide keyboard shortcuts:
  - ⌘+K: Clear all
  - ⌘+C: Copy total
  - ⌘+N: Add more lines

## Development Phases

### Phase 1: Basic Functionality
- [ ] Set up project structure
- [ ] Create basic form with 10 time entries
- [ ] Implement time parsing for HH:MM format
- [ ] Calculate and display total

### Phase 2: Enhanced Features
- [ ] Add decimal format support
- [ ] Implement real-time calculation
- [ ] Add input validation and error handling
- [ ] Create "Add More Lines" functionality

### Phase 3: Polish & UX
- [ ] Add keyboard shortcuts
- [ ] Implement copy to clipboard
- [ ] Add visual feedback for errors
- [ ] Optimize performance with debouncing

### Phase 4: Testing & Publishing
- [ ] Write unit tests for parsing/calculation
- [ ] Test edge cases
- [ ] Create extension icon
- [ ] Prepare for Raycast Store submission

## Future Enhancements
- Save/load time entries
- Time entry presets
- Export to CSV
- Integration with time tracking apps
- Support for date ranges
- Break time calculation

## Resources Needed
- Raycast API documentation
- TypeScript/React knowledge
- Icon design (or use free icon)
- Testing on macOS
