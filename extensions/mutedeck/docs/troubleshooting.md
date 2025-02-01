# Troubleshooting Guide

This guide helps you resolve common issues with the MuteDeck Raycast extension.

## Quick Checklist

Before diving into specific issues, verify these common requirements:

1. ✓ MuteDeck desktop app is running
2. ✓ You're on macOS 12 or later
3. ✓ Raycast version is 1.50.0 or later
4. ✓ You're in an active meeting (for meeting controls)
5. ✓ Network connectivity is stable

## Common Issues

### 1. Commands Not Working

#### Symptoms

- Commands don't respond
- Error messages about MuteDeck not running
- Controls appear disabled

#### Solutions

1. Verify MuteDeck Status
   ```bash
   # Check if MuteDeck is running
   ps aux | grep mutedeck
   ```
2. Check MuteDeck Desktop App

   - Open MuteDeck app
   - Verify it shows "Running" status
   - Restart if necessary

3. Verify Permissions

   - Open System Preferences
   - Check Accessibility permissions
   - Verify app permissions

4. Reset Connection
   - Restart MuteDeck app
   - Clear Raycast command cache (⌘ + ⌥ + R)
   - Try commands again

### 2. Visual Issues

#### Symptoms

- Missing icons
- Generic command icons showing
- Icons not updating after changes
- Inconsistent icon appearance

#### Solutions

1. Verify Icon Files

   - Check icons are in `assets` directory
   - Ensure each icon is a unique file (use `md5` to verify)
   - Confirm PNG format and proper dimensions
   - Verify transparent backgrounds

2. Clear Raycast Cache

   ```bash
   rm -rf ~/Library/Caches/com.raycast.macos
   ```

   - Quit Raycast completely
   - Restart Raycast
   - Run dev server again

3. Check Icon References

   - Verify package.json icon paths
   - Use simple filenames (e.g., "info.png")
   - Don't include "assets/" in the path
   - Ensure icon names match exactly

4. Icon Requirements
   - Use PNG format
   - Square dimensions (512x512 recommended)
   - Transparent backgrounds
   - Clear, simple designs
   - Unique files for each icon

### 3. Status Not Updating

#### Symptoms

- Stale meeting status
- Incorrect mute state
- Delayed updates

#### Solutions

1. Check Network

   - Verify localhost connectivity
   - Check for firewall issues
   - Reset network if needed

2. Refresh Status

   - Close and reopen status view
   - Check MuteDeck connection
   - Verify meeting is active

3. Reset Services
   - Restart MuteDeck app
   - Clear Raycast cache
   - Check system resources

### 4. Performance Issues

#### Symptoms

- Slow command response
- Delayed notifications
- UI lag

#### Solutions

1. Check System Resources

   - Monitor CPU usage
   - Check available memory
   - Close unused applications

2. Optimize Settings

   - Adjust refresh interval
   - Reduce notifications if needed
   - Close unused commands

3. Clean Installation
   - Clear all caches
   - Reinstall extension
   - Reset preferences

## Advanced Troubleshooting

### Logging and Debugging

1. Enable Debug Logs

   ```bash
   defaults write com.raycast.macos LogLevel -string "debug"
   ```

2. Check System Logs

   ```bash
   log show --predicate 'processImagePath contains "Raycast"' --last 30m
   ```

3. Review MuteDeck Logs
   - Open MuteDeck preferences
   - Enable debug logging
   - Check log files

### Network Diagnostics

1. Test API Endpoint

   ```bash
   curl http://localhost:3491/status
   ```

2. Check Port Availability
   ```bash
   lsof -i :3491
   ```

### Recovery Steps

If all else fails:

1. Complete Reset

   - Uninstall MuteDeck
   - Remove Raycast extension
   - Clear all preferences
   - Reinstall fresh

2. Configuration Backup
   - Save current preferences
   - Document custom settings
   - Restore after reset

## Getting Help

If you're still experiencing issues:

1. Check [GitHub Issues](https://github.com/chadrwalters/mutedeck-raycast-extension/issues)
2. Submit a new issue with:
   - Detailed problem description
   - Steps to reproduce
   - System information
   - Log files if available

## Prevention

To prevent future issues:

1. Keep Updated

   - Update Raycast regularly
   - Keep MuteDeck app current
   - Check for extension updates

2. Regular Maintenance

   - Clear caches periodically
   - Review logs for warnings
   - Update preferences as needed

3. Backup Settings
   - Export preferences
   - Document custom shortcuts
   - Save special configurations
