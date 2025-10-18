# Auto-Refresh Feature for WebBlocker Extension

## Overview
The WebBlocker extension now includes an **automatic browser tab refresh feature** that eliminates the need for manual page refreshes when enabling or disabling website blocking. This ensures immediate enforcement of blocking rules without any user intervention.

## How It Works

### When Enabling Blocking
1. User enables website blocking for their domain list
2. Hosts file is updated with blocking rules
3. DNS caches are cleared
4. Network connections are cycled
5. **🔄 NEW: All open browser tabs matching blocked domains are automatically refreshed for 5 seconds**
6. Blocked websites become immediately inaccessible, even in already-open tabs

### When Disabling Blocking
1. User disables website blocking
2. Hosts file entries are removed
3. DNS caches are cleared
4. Network connections are cycled
5. **🔄 NEW: All open browser tabs matching previously blocked domains are automatically refreshed for 5 seconds**
6. Previously blocked websites become immediately accessible again

## Technical Implementation

### New Module: `browserRefresher.ts`
A dedicated module that handles automatic browser tab refreshing using AppleScript.

**Key Features:**
- Detects running browsers (Safari, Chrome, Arc, Edge)
- Generates browser-specific AppleScript commands
- Refreshes only tabs matching blocked/unblocked domains
- Runs for 5 seconds (configurable 4-7 seconds) with 1-second intervals
- Supports both www and non-www domain variants
- Handles errors gracefully without interrupting the blocking process

### Supported Browsers
- ✅ Safari
- ✅ Google Chrome
- ✅ Arc
- ✅ Microsoft Edge
- ❌ Firefox (AppleScript limitations)

### Integration Points

#### 1. `streamlinedHostsManager.ts`
```typescript
// After enabling blocking
autoRefreshTabsForDuration(domains, 5).catch(error => {
  console.error('Error during auto-refresh:', error);
});

// After disabling blocking
if (blockedDomains.length > 0) {
  autoRefreshTabsForDuration(blockedDomains, 5).catch(error => {
    console.error('Error during auto-refresh:', error);
  });
}
```

#### 2. `streamlined-enable-blocking.tsx`
Updated success message:
```
✅ Blocking active! Open tabs are being automatically refreshed for immediate effect
```

#### 3. `streamlined-disable-blocking.tsx`
Updated success message:
```
🎉 All websites unblocked! Open tabs are being automatically refreshed
```

## AppleScript Implementation

### Safari Example
```applescript
tell application "Safari"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          if (tabURL contains "youtube.com" or tabURL contains "www.youtube.com") then
            do JavaScript "window.location.reload(true);" in t
          end if
        end try
      end repeat
    end repeat
  end if
end tell
```

### Chrome/Arc/Edge Example
```applescript
tell application "Google Chrome"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          if (tabURL contains "youtube.com" or tabURL contains "www.youtube.com") then
            reload t
          end if
        end try
      end repeat
    end repeat
  end if
end tell
```

## Configuration Options

### Default Duration: 5 seconds
The auto-refresh runs for 5 seconds by default (recommended range: 4-7 seconds).

**Why 5 seconds?**
- Ensures multiple refresh attempts for reliability
- Accounts for DNS propagation delays
- Handles slow network connections
- Doesn't cause excessive browser activity

### Customization
To change the duration, modify the function call in `streamlinedHostsManager.ts`:

```typescript
// Change from 5 to 7 seconds
autoRefreshTabsForDuration(domains, 7)
```

## Behavior Details

### Intelligent Domain Matching
The refresh script checks for:
- Exact domain match (e.g., `youtube.com`)
- www variant (e.g., `www.youtube.com`)
- Non-www variant (e.g., `youtube.com` when blocking `www.youtube.com`)

### Refresh Interval
- Initial refresh: Immediately after blocking/unblocking
- Subsequent refreshes: Every 1 second for the configured duration
- This ensures coverage even if DNS changes take time to propagate

### Error Handling
- If a browser doesn't support AppleScript, it's silently skipped
- If AppleScript execution fails, the error is logged but doesn't break the flow
- The blocking/unblocking operation succeeds regardless of refresh status

## User Experience

### Before Auto-Refresh Feature
1. User enables blocking ➡️ Manual refresh required (⌘⇧R)
2. Open tabs still show blocked content until refreshed
3. User had to remember to refresh each tab manually

### After Auto-Refresh Feature
1. User enables blocking ➡️ **All tabs automatically refreshed**
2. Blocked sites become immediately inaccessible
3. No manual intervention needed
4. Seamless, instant enforcement

## Performance Impact

### Minimal System Load
- Only refreshes tabs matching blocked/unblocked domains
- Uses efficient AppleScript commands
- Runs asynchronously without blocking other operations
- Automatically stops after the configured duration

### Network Considerations
- Each refresh triggers a single HTTP request per tab
- For 5 seconds with 1-second intervals: ~5 requests per affected tab
- Network usage is negligible for modern connections

## Testing the Feature

### Test Scenario 1: Enabling Blocking
1. Open YouTube in a browser tab
2. Run "Enable Website Blocking" with YouTube in your block list
3. **Expected:** YouTube tab automatically refreshes and shows blocking page within 5 seconds

### Test Scenario 2: Disabling Blocking
1. Have YouTube blocked and open in a tab (showing block page)
2. Run "Disable Website Blocking"
3. **Expected:** YouTube tab automatically refreshes and becomes accessible within 5 seconds

### Test Scenario 3: Multiple Browsers
1. Open blocked sites in Safari and Chrome simultaneously
2. Enable/disable blocking
3. **Expected:** Tabs in both browsers refresh automatically

### Test Scenario 4: No Browsers Running
1. Close all browsers
2. Enable/disable blocking
3. **Expected:** Operation completes normally with console message: "No supported browsers running"

## Troubleshooting

### Issue: Tabs Don't Refresh Automatically
**Possible Causes:**
- Browser not supported (Firefox)
- AppleScript permissions not granted
- Browser is minimized or in background

**Solution:**
- Use supported browsers (Safari, Chrome, Arc, Edge)
- Grant Raycast accessibility permissions in System Preferences
- Keep browser windows active (not hidden)

### Issue: Refresh Takes Longer Than Expected
**Possible Causes:**
- Slow network connection
- DNS propagation delays
- Many tabs open

**Solution:**
- Wait the full 5 seconds for multiple refresh attempts
- Consider increasing duration to 7 seconds for slower networks

## Future Enhancements

Potential improvements for future versions:
1. Add Firefox support using alternative methods
2. Make duration configurable via extension settings
3. Add option to disable auto-refresh for power users
4. Show visual progress indicator during refresh
5. Add option to close tabs instead of refreshing

## Code Files Modified

### New Files
- `src/browserRefresher.ts` - Core auto-refresh functionality

### Modified Files
- `src/streamlinedHostsManager.ts` - Integrated auto-refresh calls
- `src/streamlined-enable-blocking.tsx` - Updated user messages
- `src/streamlined-disable-blocking.tsx` - Updated user messages

## Summary

The auto-refresh feature transforms the WebBlocker extension into a truly seamless blocking solution. Users no longer need to manually refresh tabs or worry about already-open pages. The extension now provides immediate, automatic enforcement of blocking rules across all supported browsers, making website blocking as effortless as possible.

**Key Benefits:**
✅ Immediate effect - no manual refresh needed
✅ Works with already-open tabs
✅ Supports multiple browsers simultaneously  
✅ Intelligent domain matching (www/non-www)
✅ Runs automatically in background
✅ Zero user intervention required
✅ Graceful error handling
