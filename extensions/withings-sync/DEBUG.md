# Debugging Guide

## Quick Start

1. **Run in development mode:**
   ```bash
   npm run dev
   ```

2. **Open Developer Console:**
   - While using the extension, press `⌘ + Shift + D` (Command + Shift + D)
   - This opens the Raycast developer console with full console output

## What to Look For

### Console Output Tags

The extension now logs detailed information with tags:

- `[SYNC]` - Sync operation logs
- `[CHECK]` - Garmin data checking operations
- `[GARMIN]` - Direct Garmin API calls
- `[DUMP: label]` - Quick data dumps
- `[DEBUG]` - File output locations

### Key Debug Points

1. **Before Sync** - Check if measurement exists:
   ```
   [SYNC] Checking if measurement exists in Garmin: { date: "2025-12-27T...", weight: 79.1 }
   [GARMIN] Found 3 measurements for 2025-12-27: [79.2, 79.2, 79.2]
   [GARMIN] Checking weight 79.1kg - Match found: false
   [SYNC] Measurement exists check result: false
   ```

2. **Garmin Data Check** - Full comparison:
   ```
   [CHECK] Garmin weight data fetched: { dateRange: "...", daysFound: 8, data: {...} }

   === DATA COMPARISON ===
   Withings measurements: 8
   Garmin days with data: 8

   2025-12-27:
     Withings: 79.10kg
     Garmin: 79.20kg (3 entries)
     Diff: 0.100kg
     Match: ✗
   ```

3. **Debug Files** - JSON exports in `/tmp/withings-raycast-debug/`:
   - `garmin-check.json` - Full data comparison when you click "Check Garmin"
   - Contains both Withings and Garmin data for side-by-side inspection

## Inspecting Debug Files

```bash
# List debug files
ls -lh /tmp/withings-raycast-debug/

# View latest check
cat /tmp/withings-raycast-debug/garmin-check.json | python3 -m json.tool

# Or use jq for better formatting
cat /tmp/withings-raycast-debug/garmin-check.json | jq '.'
```

## Common Issues to Debug

### Duplicates Not Detected
Look for:
- Weight tolerance (0.1kg): `Diff: 0.XXXkg`
- Number of entries: `(X entries)`
- Match result: `Match: ✓` or `✗`

### Stale Cache
- Check timestamps in console
- Verify cache is cleared: look for "Garmin data cache cleared" messages
- Check if auto-refresh runs after sync

### API Delays
- Note timestamp between sync and check
- Garmin may take 2-5 seconds to index new data
- Extension waits 2 seconds automatically

## Testing Workflow

1. Run `npm run dev`
2. Open Raycast → "Sync to Garmin"
3. Open console (`⌘⇧D`)
4. Click "Check Garmin for Existing Data"
5. Review console output and `/tmp/withings-raycast-debug/garmin-check.json`
6. Try syncing a measurement
7. Check console for duplicate detection
8. Wait for auto-refresh to complete

## Clean Debug Output

To see only your extension's logs in console:
```
Filter by: [SYNC] OR [CHECK] OR [GARMIN]
```

## Terminal Debugging (Alternative)

If you want to tail logs in terminal:

```bash
# Watch temp directory for new debug files
watch -n 1 'ls -lht /tmp/withings-raycast-debug/ | head -5'

# Monitor latest file changes
tail -f /tmp/withings-raycast-debug/garmin-check.json
```

## Disabling Debug Logging

To remove debug logs for production:
1. Search for `console.log` calls with tags: `[SYNC]`, `[CHECK]`, `[GARMIN]`
2. Remove or comment them out
3. Remove debug file writes (`writeDebugData` calls)
