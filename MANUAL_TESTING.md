# Manual Testing Guide - WebBlocker Extension

This guide helps you manually test all functionality of the WebBlocker extension.

## Prerequisites

1. macOS 10.15 or later
2. Raycast app installed
3. Extension built and loaded into Raycast
4. Administrator access (for hosts file modifications)

## Test Scenarios

### 1. Add Website Command

**Test Case 1.1: Valid Domain Addition**
1. Open Raycast and search "Add Website to Block"
2. Enter `youtube.com` in the Website field
3. Enter `Distraction during work` in Notes field
4. Submit form
5. **Expected**: Success toast showing "youtube.com added to your block list"

**Test Case 1.2: URL Sanitization**
1. Add Website command
2. Enter `https://www.facebook.com/path/to/page?param=1`
3. Submit
4. **Expected**: Should be sanitized to `facebook.com`

**Test Case 1.3: Duplicate Detection**
1. Try adding `youtube.com` again (case insensitive)
2. **Expected**: Error HUD showing "youtube.com is already in your block list"

**Test Case 1.4: Invalid Domain**
1. Try adding `invalid-domain-no-tld`
2. **Expected**: Error HUD showing validation error

### 2. View Blocked Sites Command

**Test Case 2.1: List Display**
1. Open "View Blocked Sites"
2. **Expected**: 
   - Shows "Blocking is INACTIVE" status
   - Lists previously added domains with dates
   - Shows notes for each domain

**Test Case 2.2: Domain Deletion**
1. In the blocked sites list
2. Select a domain and press ⌘⌫ (or use action menu)
3. Confirm deletion
4. **Expected**: Domain removed with success toast

**Test Case 2.3: Empty State**
1. Remove all domains from list
2. **Expected**: Empty state with "Add Website" button

### 3. Enable Blocking Command

**Test Case 3.1: Successful Activation**
1. Ensure you have domains in your block list
2. Run "Enable Site Blocking"
3. Confirm in the dialog
4. Enter admin password when prompted
5. **Expected**: 
   - Success toast "Site Blocking Enabled"
   - Backup confirmation HUD if first time
   - Domains should now be blocked in browser

**Test Case 3.2: No Domains Error**
1. Clear all domains from block list
2. Try "Enable Site Blocking"
3. **Expected**: Error HUD "No websites in your block list"

**Test Case 3.3: Authentication Cancellation**
1. Run "Enable Site Blocking"
2. Cancel the authentication dialog
3. **Expected**: HUD "Authentication canceled - blocking not enabled"

### 4. Disable Blocking Command

**Test Case 4.1: Successful Deactivation**
1. With blocking active, run "Disable Site Blocking"
2. Confirm in dialog
3. Enter admin password
4. **Expected**: Success toast "Site Blocking Disabled"

**Test Case 4.2: Already Disabled**
1. With blocking inactive, try "Disable Site Blocking"
2. **Expected**: HUD "Site blocking is already disabled"

### 5. System Integration Tests

**Test Case 5.1: Hosts File Verification**
```bash
# Check if domains are added when blocking enabled
sudo cat /etc/hosts | grep "# WebBlocker"

# Expected output (when active):
127.0.0.1 youtube.com # WebBlocker
127.0.0.1 facebook.com # WebBlocker
```

**Test Case 5.2: Backup File Creation**
```bash
# Check if backup was created
ls -la /etc/hosts.webblocker.bak

# Should exist after first enable operation
```

**Test Case 5.3: DNS Resolution Test**
```bash
# With blocking enabled
nslookup youtube.com
# Expected: Should resolve to 127.0.0.1

# With blocking disabled
nslookup youtube.com
# Expected: Should resolve to actual YouTube IP
```

**Test Case 5.4: Browser Testing**
1. Enable blocking for `facebook.com`
2. Open browser and navigate to `https://facebook.com`
3. **Expected**: Page should not load (connection refused/timeout)
4. Disable blocking
5. Navigate to `https://facebook.com` again
6. **Expected**: Page should load normally

### 6. Edge Cases & Error Handling

**Test Case 6.1: Permissions Error**
1. Try running commands without admin privileges
2. **Expected**: Appropriate error messages

**Test Case 6.2: Hosts File Recovery**
```bash
# If something goes wrong, test recovery
sudo cp /etc/hosts.webblocker.bak /etc/hosts
```

**Test Case 6.3: Large Domain List**
1. Add 50+ domains to block list
2. Enable blocking
3. **Expected**: Should handle large lists without issues

### 7. Data Persistence Tests

**Test Case 7.1: Extension Restart**
1. Add domains and enable blocking
2. Quit and restart Raycast
3. **Expected**: Settings and status should persist

**Test Case 7.2: System Reboot**
1. Enable blocking
2. Restart macOS
3. Check "View Blocked Sites" - should show "INACTIVE"
4. Check browser - sites should be accessible
5. Re-enable blocking
6. **Expected**: Block list persists, but needs re-activation

## Automated Verification Scripts

```bash
# Quick status check
cat /etc/hosts | grep -c "# WebBlocker"

# DNS flush (if needed during testing)
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Restore original hosts file
sudo cp /etc/hosts.webblocker.bak /etc/hosts
```

## Common Issues & Solutions

1. **"Authentication was canceled"** - User needs to enter correct admin password
2. **"Administrator privileges required but sudo is not available"** - System configuration issue
3. **Websites still loading** - Clear browser DNS cache or try incognito mode
4. **Blocking not working** - Check if domains are correctly added to hosts file

## Test Completion Checklist

- [ ] All four commands execute without errors
- [ ] Domain validation works correctly
- [ ] Hosts file modifications are safe and tagged
- [ ] Backup and restore functionality works
- [ ] Browser blocking is effective
- [ ] Data persists correctly
- [ ] Error handling is user-friendly
- [ ] Authentication flows work properly

## Performance Notes

- Extension should respond quickly (<1s for most operations)
- Host file operations may take 2-5s due to authentication
- DNS changes may take up to 30s to fully propagate
- Large domain lists (100+) should still perform acceptably