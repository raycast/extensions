# Implementation Plan: Date Dividers for Sent/Received Messages

## Executive Summary

This plan details the implementation of date-based `List.Section` dividers for the sent-messages and received-messages list pages. The feature will group messages into chronological sections: "Today", "Yesterday", "This Week", "This Month", "This Year", and year-based sections for older messages.

**Target Files:**
- `/Users/personal/dev/raycast/raycast-extensions/claude-code-utils/src/commands/sent-messages/list.tsx`
- `/Users/personal/dev/raycast/raycast-extensions/claude-code-utils/src/commands/received-messages/list.tsx`

**Impact:** Display improvement only - no changes to detail pages, data fetching, or storage logic.

---

## Current State Analysis

### Existing Code Structure

#### sent-messages/list.tsx (Lines 1-309)

**Current Implementation:**
```typescript
// Line 259-305: Messages are rendered in a flat list without sections
{displayMessages.map((message) => (
  <List.Item
    key={message.id}
    title={message.preview}
    accessories={[
      {
        text: message.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]}
    // ... actions
  />
))}
```

**Key Observations:**
1. Messages are sorted by timestamp (newest first) at line 66-68
2. Uses `displayMessages` computed from either `normalSearch()` or AI search results
3. Accessories show only time, not full date
4. No sectioning - all messages in single flat list
5. Search functionality works with both normal and AI search

#### received-messages/list.tsx (Lines 1-309)

**Identical Structure to sent-messages:**
1. Same sorting logic (line 66-68)
2. Same display pattern (line 259-305)
3. Same search implementation
4. Only difference: uses `getReceivedMessages()` instead of `getSentMessages()`

### Data Types

From `src/utils/claudeMessages.ts`:

```typescript
export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;  // ← Key field for date grouping
  sessionId: string;
  projectPath?: string;
}

export interface ParsedMessage extends Message {
  id: string;
  preview: string;
  isPinned?: boolean;
}
```

**Critical Detail:** `timestamp` is a `Date` object, making date comparisons straightforward.

### Current Search Behavior

Both files implement dual search modes:

1. **Normal Search** (immediate): Filters using `normalSearch()` from `utils/aiSearch.ts`
2. **AI Search** (debounced): Uses semantic search via `semanticSearch()`

The `displayMessages` useMemo hook (lines 111-116) switches between:
- Filtered results (search active)
- Full message list (no search)

**Important:** Date grouping must preserve search functionality.

---

## Reference Implementation: cheatsheet/list.tsx

The cheatsheet command demonstrates List.Section usage:

```typescript
// Lines 70-106: Category-based sections
commandsByCategory.map(({ category, commands }) => (
  <List.Section
    key={category}
    title={`${category} (${commands.length})`}
  >
    {commands.map((command) => (
      <List.Item
        key={command.id}
        // ... item props
      />
    ))}
  </List.Section>
))
```

**Key Pattern:**
1. Pre-group data into sections before rendering
2. Map over sections, rendering `List.Section` wrapper
3. Each section maps over its items
4. Section titles include item counts

This pattern applies directly to date grouping.

---

## Proposed Solution

### Date Grouping Logic

#### Date Category Definitions

Messages will be categorized into the following sections (in display order):

1. **"Today"** - Messages from the current calendar day (midnight to now)
2. **"Yesterday"** - Messages from the previous calendar day
3. **"This Week"** - Messages from the current week (Sunday to Saturday, excluding Today/Yesterday)
4. **"This Month"** - Messages from the current month (excluding This Week)
5. **"This Year"** - Messages from the current year (excluding This Month)
6. **Year Sections** - e.g., "2024", "2023" for older messages

#### Date Comparison Algorithm

```typescript
function getDateCategory(messageDate: Date, now: Date = new Date()): string {
  // Normalize dates to midnight for accurate day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const msgDate = new Date(
    messageDate.getFullYear(),
    messageDate.getMonth(),
    messageDate.getDate()
  );

  // Check if same day as today
  if (msgDate.getTime() === today.getTime()) {
    return "Today";
  }

  // Check if yesterday
  if (msgDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  // Check if this week (Monday to Sunday)
  const startOfWeek = new Date(today);
  const dayOfWeek = today.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday is 0, so it's 6 days from Monday
  startOfWeek.setDate(today.getDate() - daysFromMonday); // Go to Monday

  if (msgDate >= startOfWeek && msgDate < today) {
    return "This Week";
  }

  // Check if this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (msgDate >= startOfMonth && msgDate < startOfWeek) {
    return "This Month";
  }

  // Check if this year
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  if (msgDate >= startOfYear && msgDate < startOfMonth) {
    return "This Year";
  }

  // Older messages - group by year
  return messageDate.getFullYear().toString();
}
```

#### Section Ordering

Sections must appear in chronological order (newest to oldest):

```typescript
const SECTION_ORDER = [
  "Today",
  "Yesterday",
  "This Week",
  "This Month",
  "This Year",
  // Year numbers in descending order (2024, 2023, 2022...)
];

function getSectionSortKey(section: string): number {
  const index = SECTION_ORDER.indexOf(section);
  if (index !== -1) return index;

  // Year sections: newer years first
  // Convert "2024" -> -2024 for descending numeric sort
  const year = parseInt(section);
  return isNaN(year) ? 9999 : -year;
}
```

---

### Helper Functions Needed

Create a new utility file: `/Users/personal/dev/raycast/raycast-extensions/claude-code-utils/src/utils/dateGrouping.ts`

```typescript
import { ParsedMessage } from "./claudeMessages";

/**
 * Date category for message grouping
 */
export type DateCategory =
  | "Today"
  | "Yesterday"
  | "This Week"
  | "This Month"
  | "This Year"
  | string; // Year numbers like "2024"

/**
 * Grouped messages by date category
 */
export interface MessageGroup {
  category: DateCategory;
  messages: ParsedMessage[];
  sortKey: number; // For ordering sections
}

/**
 * Determines which date category a message belongs to
 *
 * @param messageDate - The message timestamp
 * @param now - Current date (defaults to new Date(), injectable for testing)
 * @returns Category string ("Today", "Yesterday", "2023", etc.)
 */
export function getDateCategory(
  messageDate: Date,
  now: Date = new Date()
): DateCategory {
  // Normalize dates to midnight for day-level comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const msgDate = new Date(
    messageDate.getFullYear(),
    messageDate.getMonth(),
    messageDate.getDate()
  );

  // Today check
  if (msgDate.getTime() === today.getTime()) {
    return "Today";
  }

  // Yesterday check
  if (msgDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  // This Week check (Monday to Sunday)
  const startOfWeek = new Date(today);
  const dayOfWeek = today.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday is 0, so it's 6 days from Monday
  startOfWeek.setDate(today.getDate() - daysFromMonday); // Go to Monday

  if (msgDate >= startOfWeek && msgDate < yesterday) {
    return "This Week";
  }

  // This Month check
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (msgDate >= startOfMonth && msgDate < startOfWeek) {
    return "This Month";
  }

  // This Year check
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  if (msgDate >= startOfYear && msgDate < startOfMonth) {
    return "This Year";
  }

  // Older - group by year
  return messageDate.getFullYear().toString();
}

/**
 * Section display order (newest to oldest)
 */
const SECTION_ORDER: DateCategory[] = [
  "Today",
  "Yesterday",
  "This Week",
  "This Month",
  "This Year",
];

/**
 * Calculate sort key for section ordering
 * Lower numbers appear first
 *
 * @param category - Date category
 * @returns Sort key (0-4 for standard sections, negative years for year sections)
 */
export function getSectionSortKey(category: DateCategory): number {
  const index = SECTION_ORDER.indexOf(category);
  if (index !== -1) return index;

  // Year sections: convert to negative for descending order
  // "2024" -> -2024, "2023" -> -2023
  // This puts 2024 before 2023
  const year = parseInt(category);
  return isNaN(year) ? 9999 : -year;
}

/**
 * Groups messages by date category
 *
 * @param messages - Array of messages to group (already sorted by timestamp)
 * @returns Array of message groups, sorted by section order
 */
export function groupMessagesByDate(
  messages: ParsedMessage[]
): MessageGroup[] {
  // Group messages by category
  const groups = new Map<DateCategory, ParsedMessage[]>();

  for (const message of messages) {
    const category = getDateCategory(message.timestamp);

    if (!groups.has(category)) {
      groups.set(category, []);
    }

    groups.get(category)!.push(message);
  }

  // Convert to array and sort by section order
  const groupArray: MessageGroup[] = Array.from(groups.entries()).map(
    ([category, messages]) => ({
      category,
      messages,
      sortKey: getSectionSortKey(category),
    })
  );

  return groupArray.sort((a, b) => a.sortKey - b.sortKey);
}

/**
 * Formats section title with message count
 *
 * @param category - Date category
 * @param count - Number of messages in section
 * @returns Formatted title like "Today (5)" or "2023 (12)"
 */
export function formatSectionTitle(
  category: DateCategory,
  count: number
): string {
  return `${category} (${count})`;
}
```

---

### Changes to sent-messages/list.tsx

#### Step 1: Add Import (After Line 19)

**Before:**
```typescript
import CreateSnippet from "../create-snippet/list";
import MessageDetail from "./detail";
```

**After:**
```typescript
import CreateSnippet from "../create-snippet/list";
import MessageDetail from "./detail";
import { groupMessagesByDate, formatSectionTitle } from "../../utils/dateGrouping";
```

#### Step 2: Compute Grouped Messages (After Line 116)

**Before:**
```typescript
  // Filter messages immediately for normal search
  const displayMessages = useMemo(() => {
    if (!useAISearch && searchText.trim()) {
      return normalSearch(messages, searchText);
    }
    return filteredMessages;
  }, [messages, searchText, useAISearch, filteredMessages]);

  // Perform AI search only on debounced text
  useEffect(() => {
    // ... AI search logic
  }, [debouncedSearchText, useAISearch, messages]);
```

**After:**
```typescript
  // Filter messages immediately for normal search
  const displayMessages = useMemo(() => {
    if (!useAISearch && searchText.trim()) {
      return normalSearch(messages, searchText);
    }
    return filteredMessages;
  }, [messages, searchText, useAISearch, filteredMessages]);

  // Group messages by date for section display
  const messageGroups = useMemo(() => {
    return groupMessagesByDate(displayMessages);
  }, [displayMessages]);

  // Perform AI search only on debounced text
  useEffect(() => {
    // ... AI search logic
  }, [debouncedSearchText, useAISearch, messages]);
```

#### Step 3: Update Accessories to Show Full Date (Lines 263-269)

**Before:**
```typescript
accessories={[
  {
    text: message.timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  },
]}
```

**After:**
```typescript
accessories={[
  {
    text: message.timestamp.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  },
]}
```

**Rationale:** With sections showing the date period, accessories should show specific date + time for clarity.

#### Step 4: Replace Flat List with Grouped Sections (Lines 259-305)

**Before:**
```typescript
{displayMessages.map((message) => (
  <List.Item
    key={message.id}
    title={message.preview}
    accessories={[
      {
        text: message.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]}
    actions={
      <ActionPanel>
        {/* ... action items ... */}
      </ActionPanel>
    }
  />
))}
```

**After:**
```typescript
{messageGroups.map((group) => (
  <List.Section
    key={group.category}
    title={formatSectionTitle(group.category, group.messages.length)}
  >
    {group.messages.map((message) => (
      <List.Item
        key={message.id}
        title={message.preview}
        accessories={[
          {
            text: message.timestamp.toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Message"
              icon={Icon.Eye}
              target={<MessageDetail message={message} />}
            />
            <Action.Paste
              title={`Paste to ${frontmostApp}`}
              content={message.content}
              icon={appIcon}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            />
            <Action
              title="Copy Message"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() => copyContent(message, true)}
            />
            <Action.Push
              title="Create Snippet from Message"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              target={<CreateSnippet content={message.content} />}
            />
            <Action
              title="Refresh Messages"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={loadMessages}
            />
          </ActionPanel>
        }
      />
    ))}
  </List.Section>
))}
```

**Complete Modified Section (Lines 259-305):**

```typescript
      {messageGroups.map((group) => (
        <List.Section
          key={group.category}
          title={formatSectionTitle(group.category, group.messages.length)}
        >
          {group.messages.map((message) => (
            <List.Item
              key={message.id}
              title={message.preview}
              accessories={[
                {
                  text: message.timestamp.toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Message"
                    icon={Icon.Eye}
                    target={<MessageDetail message={message} />}
                  />
                  <Action.Paste
                    title={`Paste to ${frontmostApp}`}
                    content={message.content}
                    icon={appIcon}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  />
                  <Action
                    title="Copy Message"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={() => copyContent(message, true)}
                  />
                  <Action.Push
                    title="Create Snippet from Message"
                    icon={Icon.Document}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                    target={<CreateSnippet content={message.content} />}
                  />
                  <Action
                    title="Refresh Messages"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadMessages}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
```

---

### Changes to received-messages/list.tsx

**IDENTICAL CHANGES** as sent-messages/list.tsx:

1. Add import for `groupMessagesByDate` and `formatSectionTitle` (after line 19)
2. Add `messageGroups` useMemo hook (after line 116)
3. Update accessories to show full date (lines 263-269)
4. Replace flat list with grouped sections (lines 259-305)

The code is structurally identical between both files, so the same modifications apply.

---

## Edge Cases Handled

### 1. Empty Message List

**Scenario:** User has no messages to display

**Handling:** Existing `List.EmptyView` components remain unchanged (lines 222-236). Empty view appears before any sections are rendered.

**Code Flow:**
```typescript
{messages.length === 0 && !isLoading && (
  <List.EmptyView
    title="No messages found"
    // ...
  />
)}
// messageGroups will be empty array, no sections render
```

**Result:** No change to current behavior.

### 2. Search Returns No Results

**Scenario:** Search query matches zero messages

**Handling:**
- `displayMessages` will be empty array
- `messageGroups` will be empty array
- Existing empty views show appropriately
- For AI search failures, the AI-specific empty view appears (lines 237-258)

**No special handling needed** - existing logic works correctly.

### 3. All Messages in One Section

**Scenario:** All messages sent/received today

**Result:**
- Single section titled "Today (15)"
- All messages grouped together
- Works correctly, no special case needed

### 4. Messages Spanning Multiple Years

**Scenario:** Messages from 2022, 2023, 2024, and 2025

**Handling:**
- Messages grouped into year sections: "2025", "2024", "2023", "2022"
- `getSectionSortKey()` ensures correct ordering (newest first)
- Each year section shows count: "2024 (42)", "2023 (128)"

**Code:**
```typescript
// Year 2025 -> sortKey: -2025
// Year 2024 -> sortKey: -2024
// Year 2023 -> sortKey: -2023
// -2025 < -2024 < -2023 → correct order
```

### 5. Messages at Midnight (Edge of Day Boundaries)

**Scenario:** Message timestamped at 2024-10-06 00:00:00

**Handling:**
- Normalization to midnight ensures consistent day comparison
- Message at midnight belongs to that day, not previous day
- `msgDate.getTime() === today.getTime()` catches these correctly

**Example:**
```typescript
// Today: 2024-10-06 14:30:00
// Message: 2024-10-06 00:00:00
// Both normalize to: 2024-10-06 00:00:00
// Match → "Today"
```

### 6. Week Boundaries (Monday-Sunday)

**Scenario:** Today is Monday, messages from previous Sunday

**Handling:**
- Week starts on Monday, ends on Sunday
- JavaScript's `getDay()` returns 0 for Sunday, 1 for Monday, etc.
- Previous Sunday is last day of previous week
- Will appear in "This Month" or appropriate section

**Logic:**
```typescript
const startOfWeek = new Date(today);
const dayOfWeek = today.getDay();
const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
startOfWeek.setDate(today.getDate() - daysFromMonday); // Monday

// If today is Monday Oct 7, startOfWeek is also Oct 7
// Sunday Oct 6 is < startOfWeek, goes to "Yesterday" or "This Month"
```

### 7. Search Results Across Multiple Sections

**Scenario:** Search for "bug" returns messages from Today, Yesterday, and 2023

**Handling:**
- Search filters `displayMessages` first
- Then grouping happens on filtered results
- Sections only appear if they have matching messages
- Empty sections are automatically excluded (no messages = no section rendered)

**Flow:**
```typescript
displayMessages (filtered by search) → groupMessagesByDate() → only populated sections
```

**Result:** "Today (2)", "Yesterday (1)", "2023 (5)" - missing sections don't appear.

### 8. Different Timezones

**Scenario:** User travels across timezones or messages from different zones

**Handling:**
- All `Date` objects use local timezone
- Comparison uses local calendar days
- Consistent behavior relative to user's current timezone
- "Today" means today in user's current timezone

**Note:** This matches Raycast's standard behavior - no special timezone handling needed.

### 9. Future Dates (Clock Skew)

**Scenario:** Message has timestamp in the future due to clock skew

**Handling:**
- Future dates within today still match "Today"
- Future dates beyond today fall into "This Week" if within week
- Very future dates (e.g., 2026 when it's 2025) create year sections

**Behavior:**
```typescript
// Today: 2025-10-06 14:00
// Message: 2025-10-06 18:00 (4 hours future)
// Normalizes to same day → "Today" ✓

// Message: 2025-10-07 (tomorrow)
// Doesn't match any category → "This Week" or "This Month"
```

**Recommendation:** Document that date categories assume reasonable clock accuracy.

### 10. Very Old Messages (Pre-2000)

**Scenario:** Messages from 1999, 1998, etc.

**Handling:**
- Year sections work for any year: "1999", "1998"
- `getSectionSortKey()` handles negative years correctly
- Display order: 1999 before 1998 (descending)

**No special handling needed** - algorithm is year-agnostic.

---

## Search Functionality Preservation

### Normal Search Flow

**Before:**
```
User types → normalSearch(messages, searchText) → displayMessages
            ↓
        Flat list renders filtered messages
```

**After:**
```
User types → normalSearch(messages, searchText) → displayMessages
            ↓
        groupMessagesByDate(displayMessages) → messageGroups
            ↓
        Sectioned list renders filtered & grouped messages
```

**Key Point:** Grouping happens AFTER filtering, so search works identically.

### AI Search Flow

**Before:**
```
User types → debounce → semanticSearch() → filteredMessages
            ↓
        displayMessages = filteredMessages
            ↓
        Flat list renders
```

**After:**
```
User types → debounce → semanticSearch() → filteredMessages
            ↓
        displayMessages = filteredMessages
            ↓
        groupMessagesByDate(displayMessages) → messageGroups
            ↓
        Sectioned list renders
```

**Behavior:** AI search results are grouped by date, showing sections only for dates with matches.

### Search Edge Case: Single Result in Section

**Scenario:** Search returns 1 message from "Yesterday"

**Display:**
```
Yesterday (1)
  └─ "Fixed the bug in authentication..."
```

**Works correctly** - section shows with count, no special case needed.

---

## Performance Considerations

### Computational Complexity

**Grouping Algorithm:**
- Time: O(n) where n = number of messages
- Space: O(n) for storing grouped data
- One pass through messages, constant-time category determination

**Impact:**
- Typical message count: 50-200 messages
- Grouping cost: < 1ms
- Re-computation only on `displayMessages` change (memoized)

**Conclusion:** Negligible performance impact.

### Re-rendering Optimization

**useMemo Dependencies:**
```typescript
const messageGroups = useMemo(() => {
  return groupMessagesByDate(displayMessages);
}, [displayMessages]);
```

**Triggers:**
- Only when `displayMessages` changes
- Search text change → displayMessages change → regroup
- Message refresh → displayMessages change → regroup
- Search mode toggle → displayMessages change → regroup

**Avoided Re-renders:**
- Typing in search (before debounce) doesn't trigger for AI mode
- Other state changes (loading, frontmostApp) don't trigger

**Conclusion:** Optimal memoization, no unnecessary work.

### Memory Usage

**Additional Memory:**
- `messageGroups` array: ~same size as `displayMessages` (references, not copies)
- Map intermediate structure: temporary, garbage collected
- Section metadata: minimal (category strings, counts)

**Estimate:**
- 200 messages × ~500 bytes = 100 KB
- Grouping overhead: ~5 KB
- Total: ~105 KB (negligible)

**Conclusion:** No memory concerns.

---

## Testing Considerations

### Manual Testing Checklist

#### Basic Functionality
- [ ] Messages appear in correct date sections
- [ ] Section order is correct (Today → Yesterday → This Week → ... → oldest year)
- [ ] Section titles show accurate counts
- [ ] All messages appear (none lost during grouping)
- [ ] Clicking message opens detail view correctly

#### Date Category Tests
- [ ] Messages from today appear in "Today"
- [ ] Messages from yesterday appear in "Yesterday"
- [ ] Messages from earlier this week appear in "This Week"
- [ ] Messages from earlier this month appear in "This Month"
- [ ] Messages from earlier this year appear in "This Year"
- [ ] Messages from previous years appear in year sections (e.g., "2024")

#### Search Integration Tests
- [ ] Normal search filters messages correctly
- [ ] Search results show only relevant sections
- [ ] Sections update immediately while typing (normal search)
- [ ] AI search shows grouped results after debounce
- [ ] Empty search shows all sections
- [ ] Search with no results shows empty view (not empty sections)

#### Edge Case Tests
- [ ] Empty message list shows empty view
- [ ] Single message appears in correct section
- [ ] All messages in one section (e.g., all today)
- [ ] Messages spanning multiple years show all year sections
- [ ] Messages at midnight (00:00:00) categorize correctly
- [ ] Week boundaries handled correctly (Sunday transitions)

#### UI/UX Tests
- [ ] Section dividers are visually clear
- [ ] Counts in section titles are accurate
- [ ] Message timestamps show full date + time in accessories
- [ ] Scrolling through sections is smooth
- [ ] Keyboard navigation works across sections
- [ ] Cmd+K actions work from any section

#### Consistency Tests
- [ ] sent-messages and received-messages have identical behavior
- [ ] Both files show same section structure
- [ ] Both handle search identically
- [ ] Both show dates in same format

### Automated Testing Strategy

**Recommended Test File:** `/src/utils/__tests__/dateGrouping.test.ts`

**Test Coverage:**

1. **getDateCategory() Tests**
   - Today detection
   - Yesterday detection
   - This Week detection (including Sunday edge)
   - This Month detection
   - This Year detection
   - Year grouping for old messages
   - Midnight boundary cases
   - Future date handling

2. **getSectionSortKey() Tests**
   - Standard sections order correctly (0-4)
   - Year sections sort descending (2024 before 2023)
   - Invalid categories handled gracefully

3. **groupMessagesByDate() Tests**
   - Groups messages correctly by category
   - Maintains message order within groups
   - Empty input returns empty array
   - Single message creates single-item group
   - Messages across multiple years create year sections

4. **formatSectionTitle() Tests**
   - Formats standard sections: "Today (5)"
   - Formats year sections: "2024 (42)"
   - Handles singular count: "Yesterday (1)"

**Example Test:**
```typescript
import { getDateCategory, groupMessagesByDate } from "../dateGrouping";
import { ParsedMessage } from "../claudeMessages";

describe("dateGrouping", () => {
  describe("getDateCategory", () => {
    it("categorizes messages from today", () => {
      const now = new Date(2025, 9, 6, 14, 30); // Oct 6, 2025, 2:30 PM
      const today = new Date(2025, 9, 6, 9, 0);  // Oct 6, 2025, 9:00 AM

      expect(getDateCategory(today, now)).toBe("Today");
    });

    it("categorizes messages from yesterday", () => {
      const now = new Date(2025, 9, 6, 14, 30);
      const yesterday = new Date(2025, 9, 5, 18, 0);

      expect(getDateCategory(yesterday, now)).toBe("Yesterday");
    });

    it("handles midnight boundary correctly", () => {
      const now = new Date(2025, 9, 6, 14, 30);
      const midnight = new Date(2025, 9, 6, 0, 0, 0);

      expect(getDateCategory(midnight, now)).toBe("Today");
    });
  });

  describe("groupMessagesByDate", () => {
    it("groups messages into correct sections", () => {
      const now = new Date(2025, 9, 6, 14, 30);

      const messages: ParsedMessage[] = [
        createMessage(new Date(2025, 9, 6, 10, 0)), // Today
        createMessage(new Date(2025, 9, 5, 18, 0)), // Yesterday
        createMessage(new Date(2024, 8, 1, 12, 0)), // 2024
      ];

      const groups = groupMessagesByDate(messages);

      expect(groups).toHaveLength(3);
      expect(groups[0].category).toBe("Today");
      expect(groups[1].category).toBe("Yesterday");
      expect(groups[2].category).toBe("2024");
    });
  });
});
```

---

## Implementation Checklist

### Phase 1: Create Utility Functions
- [ ] Create `/src/utils/dateGrouping.ts` file
- [ ] Implement `getDateCategory()` function
- [ ] Implement `getSectionSortKey()` function
- [ ] Implement `groupMessagesByDate()` function
- [ ] Implement `formatSectionTitle()` function
- [ ] Add TypeScript types (`DateCategory`, `MessageGroup`)
- [ ] Add JSDoc comments for all functions

### Phase 2: Update sent-messages/list.tsx
- [ ] Import grouping utilities (after line 19)
- [ ] Add `messageGroups` useMemo hook (after line 116)
- [ ] Update accessories to show full date format (line 263-269)
- [ ] Replace flat list with sectioned list (lines 259-305)
- [ ] Verify all action handlers still work
- [ ] Test normal search functionality
- [ ] Test AI search functionality

### Phase 3: Update received-messages/list.tsx
- [ ] Import grouping utilities (after line 19)
- [ ] Add `messageGroups` useMemo hook (after line 116)
- [ ] Update accessories to show full date format (line 263-269)
- [ ] Replace flat list with sectioned list (lines 259-305)
- [ ] Verify all action handlers still work
- [ ] Test normal search functionality
- [ ] Test AI search functionality

### Phase 4: Testing & Validation
- [ ] Create unit tests for date grouping utilities
- [ ] Run existing test suite to ensure no regressions
- [ ] Manual testing: verify all sections appear correctly
- [ ] Manual testing: verify search works with sections
- [ ] Manual testing: verify edge cases (empty list, single message, etc.)
- [ ] Visual review: ensure section titles are clear
- [ ] Visual review: ensure timestamp format is readable

### Phase 5: Code Quality
- [ ] Run `npm run fix-lint` (per project CLAUDE.md)
- [ ] Run `npm run lint` to verify no issues
- [ ] Review code for consistency with existing patterns
- [ ] Verify TypeScript types are correct
- [ ] Check for any console errors in development

### Phase 6: Documentation
- [ ] Update code comments if needed
- [ ] Verify this implementation plan matches actual code
- [ ] Note any deviations or improvements made during implementation

---

## Expected User Experience

### Before Implementation

**sent-messages View:**
```
Search your messages to Claude... [🔍] [Normal Search ▼]

Copied the authentication bug fix to...    2:30 PM
Can you review this pull request for...     1:45 PM
What's the best way to implement...         1:12 PM
Fixed the typo in the README file...       12:30 PM
Can you help me debug this error in...    Yesterday 6:15 PM
How do I set up TypeScript with...        Yesterday 2:30 PM
...
```

### After Implementation

**sent-messages View:**
```
Search your messages to Claude... [🔍] [Normal Search ▼]

Today (4)
  Copied the authentication bug fix to...    Oct 6, 2:30 PM
  Can you review this pull request for...    Oct 6, 1:45 PM
  What's the best way to implement...        Oct 6, 1:12 PM
  Fixed the typo in the README file...       Oct 6, 12:30 PM

Yesterday (2)
  Can you help me debug this error in...     Oct 5, 6:15 PM
  How do I set up TypeScript with...         Oct 5, 2:30 PM

This Week (5)
  Implemented the new feature for user...    Oct 3, 4:20 PM
  Refactored the database schema to...       Oct 2, 11:45 AM
  ...

This Month (12)
  ...

2024 (156)
  ...
```

**Benefits:**
1. Clear chronological organization
2. Quick scanning by time period
3. Section counts provide overview
4. Full date+time in accessories for precision
5. Search results still show relevant sections only

---

## Potential Future Enhancements

**Not in scope for this implementation, but worth noting:**

1. **Customizable Date Ranges**
   - User preference: "Last 7 Days" vs "This Week"
   - User preference: "Last 30 Days" vs "This Month"

2. **Collapsed Sections**
   - Allow users to collapse/expand sections
   - Remember collapsed state in LocalStorage

3. **Section Subtitles**
   - Show date range in subtitle: "This Week (Oct 1 - Oct 6)"

4. **Relative Time in Accessories**
   - "2 hours ago" for very recent messages
   - Full date for older messages

5. **Smart Sectioning**
   - If only one section, hide section header
   - If only old messages, skip empty recent sections

**Decision:** Keep initial implementation simple and add these if users request them.

---

## Risk Assessment

### Low Risk
- ✅ Adding new utility file (no impact on existing code)
- ✅ Memoization prevents performance issues
- ✅ Search functionality preserved (grouping happens after filtering)
- ✅ No changes to data fetching or storage
- ✅ Existing tests unaffected (list rendering changes only)

### Medium Risk
- ⚠️ **Section ordering logic** - Could display sections in wrong order if sortKey buggy
  - Mitigation: Comprehensive unit tests for `getSectionSortKey()`
- ⚠️ **Week boundary calculation** - Sunday/Saturday edge cases
  - Mitigation: Test with dates around week boundaries
- ⚠️ **Timezone assumptions** - Behavior across timezones
  - Mitigation: Document that dates are local timezone, test with various timezones

### High Risk
- ❌ None identified

**Overall Risk Level:** Low

**Confidence:** High - straightforward display logic change with no data model impact.

---

## Estimated Implementation Time

**Breakdown:**

1. **Create date grouping utilities** - 1 hour
   - Write functions
   - Add TypeScript types
   - Add JSDoc comments

2. **Update sent-messages/list.tsx** - 30 minutes
   - Import utilities
   - Add useMemo hook
   - Update list rendering
   - Update accessories format

3. **Update received-messages/list.tsx** - 30 minutes
   - Same changes as sent-messages

4. **Unit tests** - 1 hour
   - Test date categorization
   - Test grouping logic
   - Test edge cases

5. **Manual testing** - 1 hour
   - Test all date categories
   - Test search integration
   - Test edge cases
   - Visual review

6. **Code quality & linting** - 15 minutes
   - Run linters
   - Fix any issues

**Total Estimated Time:** 4 hours 15 minutes

**Buffer for unforeseen issues:** +1 hour

**Total with Buffer:** ~5 hours

---

## Success Criteria

Implementation is considered successful when:

1. ✅ Messages are grouped into correct date sections
2. ✅ Sections appear in chronological order (newest to oldest)
3. ✅ Section titles show accurate message counts
4. ✅ Normal search works with grouped display
5. ✅ AI search works with grouped display
6. ✅ All existing functionality preserved (actions, navigation, etc.)
7. ✅ No console errors or warnings
8. ✅ Passes `npm run lint` without errors
9. ✅ Manual testing confirms edge cases handled correctly
10. ✅ Code is consistent with project style and patterns

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding date-based dividers to the sent-messages and received-messages list pages. The approach:

- **Follows existing patterns** (cheatsheet's List.Section usage)
- **Preserves all existing functionality** (search, actions, navigation)
- **Handles edge cases** (empty lists, single sections, search results)
- **Optimizes performance** (memoization, O(n) complexity)
- **Maintains code quality** (TypeScript, linting, documentation)

The date grouping logic is simple, well-defined, and testable. The integration with existing search functionality is clean and maintains the current UX while adding organizational clarity.

**Ready to implement.**
