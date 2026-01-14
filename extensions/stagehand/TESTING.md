# Testing Guide for Stagehand

This guide will help you test the Safari compatibility fixes and Dia browser support.

## Setup

1. **Install dependencies** (if not already done):
   ```bash
   cd /Users/justinlancaster/raycast-dev/stagehand
   npm install
   ```

2. **Start development mode**:
   ```bash
   npm run dev
   ```

   This will:
   - Watch for file changes
   - Reload the extension in Raycast automatically
   - Show any compilation errors in the terminal

## Testing Safari Compatibility

### Prerequisites for Safari Testing

1. **Open Safari** and ensure it's running
2. **Enable Developer Menu** (if not already enabled):
   - Safari → Settings → Advanced
   - Check "Show features for web developers"

3. **Grant Permissions**:
   - System Settings → Privacy & Security → Automation
   - Ensure Raycast has permission to control Safari
   - If prompted, grant permission when testing

### Test Cases for Safari

#### Test 1: Find YouTube Tabs in Safari
1. Open Safari and navigate to a YouTube video (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
2. Play the video
3. In Raycast, run the **"Now Playing"** command
4. ✅ **Expected**: The YouTube video should appear in the list with "Safari" tag
5. ❌ **If it fails**: Check console logs for errors

#### Test 2: Play/Pause in Safari
1. Ensure a YouTube video is playing in Safari
2. In Raycast, run **"Play/Pause Media"** command
3. ✅ **Expected**: Video should pause, HUD shows "⏸ Paused"
4. Run command again
5. ✅ **Expected**: Video should play, HUD shows "▶ Playing"

#### Test 3: Safari with Minimized Window
1. Play a YouTube video in Safari
2. **Minimize the Safari window**
3. In Raycast, run **"Play/Pause Media"** command
4. ✅ **Expected**: Should work (window should auto-unminimize)
5. ✅ **Verify**: Safari window should no longer be minimized

#### Test 4: Safari Tab Navigation
1. Open multiple YouTube tabs in Safari
2. In Raycast, run **"Now Playing"**
3. Select a tab and click "Open Tab"
4. ✅ **Expected**: Should switch to that tab correctly

#### Test 5: All Commands in Safari
Test each command with Safari:
- ✅ **Skip Forward** - Should jump 10 seconds forward
- ✅ **Skip Backward** - Should jump 10 seconds backward  
- ✅ **Volume Up** - Should increase volume by 10%
- ✅ **Volume Down** - Should decrease volume by 10%
- ✅ **Toggle Mute** - Should mute/unmute
- ✅ **Copy URL** - Should copy clean URL
- ✅ **Copy URL at Current Time** - Should copy URL with timestamp

### Safari Edge Cases to Test

1. **Multiple Safari Windows**:
   - Open YouTube in multiple Safari windows
   - Verify "Now Playing" shows all tabs
   - Verify commands work on the correct tab

2. **Safari Private Browsing**:
   - Try with Safari in private browsing mode
   - Note: Some features may be restricted in private mode

3. **Safari with No YouTube Tabs**:
   - Run commands when no YouTube tabs are open
   - ✅ **Expected**: Should show "No YouTube videos found"

## Testing Dia Browser Support

### Prerequisites for Dia Testing

1. **Install Dia Browser** (if not installed):
   - Download from: https://dia.dev
   - Install and launch Dia

2. **Enable JavaScript from Apple Events**:
   - Open Dia browser
   - View menu → Developer → **"Allow JavaScript from Apple Events"**
   - This is required for Dia (same as Chrome/Arc/Brave)

### Test Cases for Dia

#### Test 1: Find YouTube Tabs in Dia
1. Open Dia and navigate to a YouTube video
2. Play the video
3. In Raycast, run **"Now Playing"** command
4. ✅ **Expected**: The YouTube video should appear with "Dia" tag
5. ✅ **Verify**: Browser icon shows correctly (should be a star icon)

#### Test 2: All Commands with Dia
Test all commands work with Dia:
- ✅ **Play/Pause** - Should toggle playback
- ✅ **Skip Forward/Backward** - Should skip 10 seconds
- ✅ **Volume Up/Down** - Should adjust volume
- ✅ **Toggle Mute** - Should mute/unmute
- ✅ **Copy URL** - Should copy URL
- ✅ **Copy URL at Current Time** - Should copy URL with timestamp

#### Test 3: Dia with Multiple Tabs
1. Open multiple YouTube tabs in Dia
2. Verify "Now Playing" shows all tabs
3. Test commands work on different tabs

#### Test 4: Dia Browser Not Running
1. Quit Dia completely
2. Run "Now Playing" command
3. ✅ **Expected**: Should skip Dia gracefully (no error), show other browsers' tabs

## Cross-Browser Testing

### Test Multiple Browsers Simultaneously

1. Open YouTube videos in:
   - ✅ Safari
   - ✅ Chrome (or Arc/Brave)
   - ✅ Dia (if installed)

2. Run **"Now Playing"** command
3. ✅ **Expected**: Should see videos from all browsers
4. Test selecting and controlling videos from different browsers

## Debugging Tips

### View Console Logs

When running in development mode (`npm run dev`), check the terminal for:
- Console.log messages
- Error messages
- Browser availability notices

### Check Raycast Developer Logs

1. Open Raycast
2. Go to Raycast Settings → Extensions → Stagehand
3. Check for any error messages or warnings

### Manual AppleScript Testing

You can test AppleScript directly in Script Editor:

```applescript
tell application "Safari"
  if not running then return ""
  repeat with w in windows
    repeat with t in tabs of w
      set tabURL to URL of t
      if tabURL contains "youtube.com/watch" then
        set tabTitle to name of t
        return tabTitle & ": " & tabURL
      end if
    end repeat
  end repeat
end tell
```

### Test JavaScript Execution

For Safari:
```applescript
tell application "Safari"
  set jsResult to do JavaScript "document.querySelector('video')?.paused" in tab 1 of window 1
  return jsResult
end tell
```

For Dia (same as Chrome):
```applescript
tell application "Dia"
  set jsResult to execute tab 1 of window 1 javascript "document.querySelector('video')?.paused"
  return jsResult
end tell
```

## Common Issues and Solutions

### Safari: "Failed to control media"
- **Solution**: Ensure Safari window is not minimized before running command
- **Solution**: Check System Settings → Privacy & Security → Automation permissions
- **Solution**: Restart Safari if needed

### Dia: "Browser not available"
- **Solution**: Ensure Dia is actually running
- **Solution**: Enable "Allow JavaScript from Apple Events" in Dia
- **Solution**: Check that Dia is installed at the standard location

### No videos found
- **Solution**: Ensure YouTube is open with a video loaded
- **Solution**: Video URL must contain "youtube.com/watch"
- **Solution**: Check that the browser is actually running

### JavaScript execution errors
- **Solution**: Check browser console for JavaScript errors on YouTube page
- **Solution**: Try refreshing the YouTube page
- **Solution**: Ensure video has started playing at least once (YouTube autoplay policy)

## Automated Testing Checklist

- [ ] Safari: Find tabs works
- [ ] Safari: Play/Pause works
- [ ] Safari: Works with minimized window
- [ ] Safari: All commands work
- [ ] Dia: Find tabs works (if Dia installed)
- [ ] Dia: All commands work (if Dia installed)
- [ ] Multiple browsers: All tabs show in "Now Playing"
- [ ] Cross-browser: Commands work from different browsers
- [ ] Error handling: Gracefully handles missing browsers
- [ ] Error handling: Shows appropriate messages for no videos

## Performance Testing

1. **Response Time**: Commands should respond within 1-2 seconds
2. **Multiple Tabs**: Should handle 10+ YouTube tabs without lag
3. **Multiple Browsers**: Should handle tabs across 3+ browsers efficiently

## Production Testing

Before releasing, build and test the production version:

```bash
npm run build
```

Then install and test the built extension in Raycast.

