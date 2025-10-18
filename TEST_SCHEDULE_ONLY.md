# Testing Guide: "Block only during schedule" Checkbox

## Overview
The "Block only during schedule" checkbox allows users to choose between:
- **Checked (default)**: Block the website ONLY during the scheduled times
- **Unchecked**: Block the website at ALL TIMES when blocking is enabled (schedule times are ignored)

## How to Test

### Test 1: Schedule-Only Blocking (Checkbox CHECKED)
1. Open Raycast → "Add Website to Block"
2. Enter a domain: `example.com`
3. Enable "Schedule blocking times"
4. Set schedule: 9:00 AM - 5:00 PM, Monday-Friday
5. **Ensure "Block only during schedule" is CHECKED** (this is the default)
6. Add the website
7. Enable Website Blocking

**Expected Result:**
- If current time is OUTSIDE 9:00-17:00 or not Monday-Friday → Website is NOT blocked
- If current time is WITHIN 9:00-17:00 AND Monday-Friday → Website IS blocked

### Test 2: Always Block (Checkbox UNCHECKED)
1. Open Raycast → "Add Website to Block"
2. Enter a domain: `test.com`
3. Enable "Schedule blocking times"
4. Set schedule: 9:00 AM - 5:00 PM, Monday-Friday
5. **UNCHECK "Block only during schedule"**
6. Add the website
7. Enable Website Blocking

**Expected Result:**
- Website IS blocked at ALL TIMES regardless of the schedule
- The schedule times are completely ignored
- Works even on weekends, nights, etc.

### Test 3: No Schedule (Always Block by Default)
1. Add a website WITHOUT enabling scheduling
2. Enable Website Blocking

**Expected Result:**
- Website IS blocked at all times (default behavior)

### Test 4: Edit Existing Schedule
1. Open "Manage Blocked Sites"
2. Select a domain with a schedule
3. Choose "Edit Schedule"
4. Toggle the "Block only during schedule" checkbox
5. Save

**Expected Result:**
- Checkbox state is saved correctly
- Blocking behavior changes according to the new setting

## Technical Details

### Code Implementation
The `scheduleOnly` boolean flag is stored in the `BlockingSchedule` interface:

```typescript
export interface BlockingSchedule {
  enabled: boolean;
  startTime?: string;
  endTime?: string;
  days?: number[];
  scheduleOnly?: boolean; // Key feature: controls blocking behavior
}
```

### Logic Flow (storage.ts:250-279)
```typescript
export function isScheduleActive(schedule?: BlockingSchedule): boolean {
  if (!schedule || !schedule.enabled) {
    return true; // No schedule = always active
  }
  
  // If scheduleOnly is false, always block (ignore schedule times)
  if (schedule.scheduleOnly === false) {
    return true;
  }
  
  // Check current time and day against schedule
  // Only returns true if within scheduled period
  ...
}
```

### Integration Points
1. **Add Website Form** (add-website.tsx:162-167)
   - Checkbox with `defaultValue={true}`
   - Value is saved to `schedule.scheduleOnly`

2. **Edit Schedule Form** (edit-schedule.tsx:173-178)
   - Preserves existing value: `defaultValue={domain.schedule?.scheduleOnly !== false}`

3. **Blocking Logic** (storage.ts:238-243)
   - `getEnabledDomains()` filters by `isScheduleActive()`
   - Used when enabling blocking via streamlinedHostsManager

## Quick Verification Commands

### Run Logic Test
```bash
node test-schedule-logic.js
```

This test script verifies all four scenarios:
1. scheduleOnly = false → Always returns true (always block)
2. scheduleOnly = true → Checks time/day (schedule-based blocking)
3. No schedule → Always returns true (always block)
4. Schedule disabled → Always returns true (always block)

### Manual Verification Steps
1. Build the extension: `npm run build`
2. Reload Raycast: Cmd+R in Raycast
3. Test both checkbox states as described above
4. Verify blocking works correctly in both modes

## Success Criteria
✅ Checkbox is visible when scheduling is enabled
✅ Checkbox defaults to CHECKED (schedule-only mode)
✅ When CHECKED: Blocking respects schedule times
✅ When UNCHECKED: Blocking ignores schedule (always blocks)
✅ State persists when editing schedules
✅ Logic test passes all 4 scenarios

## Notes
- The checkbox only appears when "Schedule blocking times" is enabled
- Default behavior (checked) is safer - blocks only during intended times
- Unchecking gives users flexibility to always block but keep schedule metadata
- This feature provides backward compatibility while adding new functionality
