# PagerDuty On-Call Extension - Development Guide

## 🏗️ **Optimized Architecture Overview**

This extension has been fully optimized using modern ES6 features, comprehensive utility functions, and clean separation of concerns for maximum readability, maintainability, and extensibility.

### **📁 Project Structure**

```
src/
├── api.ts              # PagerDuty API client with error handling
├── types.ts            # TypeScript interfaces and type definitions
├── utils.ts            # Comprehensive utility functions (ES6 optimized)
├── oncall-schedule.tsx # Main React component (modular & clean)
└── README.md           # User documentation
```

---

## 🔧 **Modern ES6 Features Implemented**

### **1. Arrow Functions & Concise Syntax**

```typescript
// Modern ES6 approach
export const formatTime = (date: Date): string =>
  date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

// Object method shorthand
const filterMap: Record = {
  recent_and_upcoming: () => [...past.slice(-2), ...current, ...upcoming],
  past: () => past,
  all: () => all.sort((a, b) => a.start.getTime() - b.start.getTime()),
};
```

### **2. Destructuring & Spread Operators**

```typescript
// Parameter destructuring
const { current, all, upcoming, past } = schedules;

// Array destructuring with spread
return [...lastTwoCompleted, ...current, ...upcoming];

// Object spread for immutable updates
return {
  ...groups,
  [monthYear]: [...(groups[monthYear] || []), schedule],
};
```

### **3. Template Literals & Modern String Handling**

```typescript
// Smart template literals
export const pluralize = (count: number, word: string): string => `${count} ${word}${count !== 1 ? "s" : ""}`;

// Unique key generation
export const createUniqueKey = (schedule: OnCallScheduleEntry, monthYear: string, index: number): string =>
  `${monthYear}-${schedule?.schedule?.id || index}-${schedule.start.getTime()}-${schedule.end.getTime()}-${index}`;
```

### **4. Modern Array Methods & Functional Programming**

```typescript
// Chained array operations
const searchFiltered = searchSchedules(filteredByType, searchText);
const grouped = groupSchedulesByMonth(searchFiltered);
const sortedMonths = sortMonthsChronologically(grouped);

// Reduce with ES6 patterns
export const groupSchedulesByMonth = (schedules: OnCallScheduleEntry[]): Record =>
  schedules.reduce((groups, schedule) => {
    const monthYear = formatMonthYear(schedule.start);
    return {
      ...groups,
      [monthYear]: [...(groups[monthYear] || []), schedule],
    };
  }, {} as Record);
```

---

## 🧩 **Utils.ts - Comprehensive Utility Library**

The `utils.ts` file is organized into logical sections with full documentation:

### **📅 Date & Time Formatting**

- `formatTime()` - Human-readable time strings
- `formatDate()` - Smart relative dates (Today, Tomorrow, etc.)
- `formatAccessoryDate()` - Consistent accessory display
- `calculateDuration()` - Smart duration calculations
- `formatDateRange()` - Complete date range strings
- `formatMonthYear()` - Month grouping formatting

### **📊 Schedule Processing**

- `getScheduleName()` - Safe schedule name extraction
- `categorizeSchedule()` - Status categorization (past/active/upcoming)
- `groupSchedulesByMonth()` - Organized monthly grouping
- `sortMonthsChronologically()` - Chronological month sorting

### **🔍 Filter & Search System**

- `FILTER_CONFIG` - Centralized filter definitions
- `filterSchedules()` - Modern filter map approach
- `createSearchableString()` - Comprehensive search indexing
- `searchSchedules()` - Advanced search functionality

### **🛠️ General Utilities**

- `pluralize()` - Smart pluralization
- `createUniqueKey()` - React key collision prevention
- `getGreeting()` - Time-based user experience
- `getRelativeTime()` - Relative time calculations

---

## 🎯 **Simplified Filter System**

### **Available Filters:**

1. **Recent & Upcoming** (default) - Last 2 completed + all upcoming
2. **Past Shifts** - All completed duties
3. **All (4 months)** - Next 4 months from today

### **Adding New Filters:**

```typescript
// 1. Update the FilterType in utils.ts
export type FilterType = "recent_and_upcoming" | "past" | "all" | "your_new_filter";

// 2. Add to FILTER_CONFIG
export const FILTER_CONFIG = {
  // ... existing filters
  your_new_filter: {
    title: "Your Filter Name",
    description: "Description of what this filter shows",
  },
} as const;

// 3. Add filter logic to filterSchedules()
const filterMap: Record = {
  // ... existing filters
  your_new_filter: () => {
    // Your filter logic here
    return filteredSchedules;
  },
};
```

---

## 🔍 **Enhanced Search System**

### **Search Capabilities:**

- **By Date**: "today", "tomorrow", "december", "2024"
- **By Schedule Name**: Schedule/escalation policy names
- **By Status**: "past", "active", "upcoming", "completed"
- **By Duration**: "hours", "days"

### **Search Implementation:**

```typescript
export const createSearchableString = (schedule: OnCallScheduleEntry): string => {
  const scheduleName = getScheduleName(schedule);
  const dateRange = formatDateRange(schedule);
  const duration = calculateDuration(schedule.start, schedule.end);
  const monthYear = formatMonthYear(schedule.start);
  const { isPast, isActive, isUpcoming } = categorizeSchedule(schedule);

  const status = isPast ? "past completed" : isActive ? "active current" : "upcoming future";

  return [
    scheduleName,
    dateRange,
    duration,
    monthYear,
    status,
    schedule.start.toDateString(),
    schedule.end.toDateString(),
  ]
    .join(" ")
    .toLowerCase();
};
```

---

## ⚛️ **React Component Architecture**

### **Modular Component Structure:**

```typescript
// Main component - handles state and data
export default function OnCallSchedule() {
  /* ... */
}

// Month section - displays grouped schedules
function MonthSection({ monthYear, schedules }) {
  /* ... */
}

// Empty state - contextual messaging
function EmptyState({ filterType, searchText }) {
  /* ... */
}

// Helper - icon logic
function getScheduleIcon(isPast, isActive) {
  /* ... */
}
```

### **Modern React Patterns:**

- **Hooks**: `useState`, `useMemo`, `usePromise`
- **Destructuring props**: Clean parameter handling
- **Conditional rendering**: Ternary operators for state management
- **Component composition**: Modular, reusable components

---

## 🚀 **Extension Guidelines**

### **Adding New Features:**

#### **1. New API Endpoints:**

```typescript
// Add to api.ts
async getNewEndpoint(): Promise<NewType[]> {
  const response = await this.makeRequest<PagerDutyApiResponse<NewEndpoint[]>>("/new-endpoint");
  return response.new_items || [];
}
```

#### **2. New Utility Functions:**

```typescript
// Add to utils.ts with full documentation
/**
 * Description of what this function does
 * @param param1 - Description of parameter
 * @returns Description of return value
 */
export const newUtilityFunction = (param1: Type): ReturnType => {
  // Implementation with modern ES6 features
  return result;
};
```

#### **3. New Components:**

```typescript
// Follow the established pattern
function NewComponent({
  prop1,
  prop2
}: {
  prop1: Type1;
  prop2: Type2
}) {
  // Component logic
  return <JSX />;
}
```

### **Code Quality Standards:**

1. **Documentation**: JSDoc comments for all functions
2. **TypeScript**: Proper typing for all parameters and returns
3. **ES6**: Arrow functions, destructuring, template literals
4. **Immutability**: Spread operators, no direct mutations
5. **Modularity**: Single responsibility principle
6. **Performance**: useMemo for expensive calculations

### **Testing Additions:**

```typescript
// When adding tests, follow this structure:
describe("New Feature", () => {
  it("should handle expected behavior", () => {
    // Test implementation
  });
});
```

---

## 📦 **Build & Development**

### **Development Commands:**

```bash
npm run dev      # Start development mode with hot reload
npm run build    # Build for production
npm run lint     # Check code quality
npm run fix-lint # Auto-fix linting issues
```

### **Publishing Checklist:**

- [ ] Update `author` field in `package.json`
- [ ] Run `npm run build` successfully
- [ ] Run `npm run lint` with no errors
- [ ] Test all filter options
- [ ] Test search functionality
- [ ] Verify API error handling
- [ ] Check icon display correctly

### **Performance Optimization:**

- [ ] `useMemo` for expensive calculations
- [ ] Proper React keys to prevent re-renders
- [ ] Minimal API calls with smart caching
- [ ] Efficient search indexing
- [ ] Optimized bundle size

---

## 🤝 **Contributing**

When contributing to this extension:

1. **Follow the ES6 patterns** established in the codebase
2. **Add comprehensive documentation** for new functions
3. **Use the utility functions** instead of duplicating logic
4. **Maintain type safety** with proper TypeScript annotations
5. **Test thoroughly** across all filter and search combinations

---

**This architecture provides a solid foundation for extending the PagerDuty extension while maintaining code quality, performance, and developer experience.** 🚀
