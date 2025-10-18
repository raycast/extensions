# Testing Guide - Biometric Auth & Status Sync

## 🧪 Quick Test Checklist

### ✅ Test 1: Status Synchronization

**Purpose**: Verify that blocking status is always accurate

**Steps**:
1. Open Raycast → Search "Manage Blocked Sites"
2. Note the current status (should show "Blocking is INACTIVE" or "Blocking is ACTIVE")
3. Run "Enable Website Blocking" command
4. Open "Manage Blocked Sites" again
5. **Expected**: Status should now show "🚫 Blocking is ACTIVE"
6. Run "Disable Website Blocking" command
7. Open "Manage Blocked Sites" again
8. **Expected**: Status should now show "✅ Blocking is INACTIVE"

**Success Criteria**: Status changes immediately and accurately reflects actual hosts file state

---

### 🔐 Test 2: Touch ID / Face ID Authentication

**Purpose**: Verify biometric authentication works with fallback

**On Mac WITH Touch ID/Face ID**:
1. Add a test website (e.g., `test.com`)
2. Run "Enable Website Blocking"
3. **Expected**: You should see Touch ID prompt appear
4. Place finger on Touch ID sensor
5. **Expected**: Blocking enables without password prompt
6. Open Raycast Developer Console (⌘+Shift+D)
7. Look for log: `✅ Authenticated using Touch ID/Face ID`

**On Mac WITHOUT Touch ID**:
1. Add a test website (e.g., `test.com`)
2. Run "Enable Website Blocking"
3. **Expected**: Password dialog appears immediately (no Touch ID attempt)
4. Enter password
5. **Expected**: Blocking enables
6. Check logs for: `🔑 Using password authentication...`

**Success Criteria**: 
- Touch ID works on supported devices
- Password fallback works on all devices
- Only ONE authentication prompt appears

---

### 🔄 Test 3: Status Persistence After Restart

**Purpose**: Verify status remains accurate across Raycast restarts

**Steps**:
1. Enable blocking with test domain
2. Verify status shows "ACTIVE" in Manage Blocked Sites
3. Quit Raycast (⌘+Q)
4. Reopen Raycast
5. Open "Manage Blocked Sites"
6. **Expected**: Status still shows "ACTIVE" (verified from hosts file)

**Success Criteria**: Status is consistent after restart

---

### 📋 Test 4: Multiple Operations

**Purpose**: Verify authentication and status work across multiple operations

**Steps**:
1. Add 3 test domains: `test1.com`, `test2.com`, `test3.com`
2. Run "Enable Website Blocking" → Use Touch ID
3. Check status → Should be ACTIVE
4. Run "Force Re-Block & Fix" → Use Touch ID again
5. Check status → Should still be ACTIVE
6. Run "Disable Website Blocking" → Use Touch ID
7. Check status → Should be INACTIVE

**Success Criteria**: 
- Each operation uses biometric auth
- Status is accurate after each operation

---

## 🐛 Common Issues & Solutions

### Issue: Touch ID prompt doesn't appear
**Solution**: 
- Check System Preferences → Touch ID & Password
- Ensure at least one fingerprint is registered
- The system will auto-fallback to password if Touch ID unavailable

### Issue: Status shows wrong state
**Solution**:
- This should now be FIXED
- If still occurring, check console logs
- Verify `/etc/hosts` file manually: `cat /etc/hosts | grep WebBlocker`

### Issue: "Authentication failed" error
**Solution**:
- Click "Enter Password" if Touch ID fails
- Verify you have admin privileges
- Check System Preferences → Security & Privacy

---

## 📊 Console Logs to Look For

### Successful Touch ID Authentication:
```
🔐 Attempting biometric authentication...
✅ Authenticated using Touch ID/Face ID
```

### Password Fallback:
```
🔐 Attempting biometric authentication...
⚠️ Biometric unavailable, falling back to password...
🔑 Using password authentication...
✅ Authenticated using password
```

### Status Verification:
```
✅ Loaded X domains. Blocking is ACTIVE (verified from hosts file)
```

---

## 🔍 Advanced Testing

### Verify Hosts File Directly

Check if blocking entries exist:
```bash
cat /etc/hosts | grep "# WebBlocker"
```

Should show entries like:
```
127.0.0.1 test.com # WebBlocker
127.0.0.1 www.test.com # WebBlocker
```

### Check Authentication Method Used

1. Open Raycast Developer Console (⌘+Shift+D)
2. Enable blocking
3. Look for authentication logs
4. Verify correct method was used (biometric vs password)

### Test Cancellation

1. Run "Enable Website Blocking"
2. When Touch ID/password prompt appears → Click Cancel
3. **Expected**: Operation canceled, status remains unchanged
4. Check logs for: `⚠️ Authentication canceled by user`

---

## ✨ Expected Behavior Summary

| Action | Authentication | Status Update | Hosts File |
|--------|---------------|---------------|------------|
| Enable Blocking | Touch ID → Password | Syncs to ACTIVE | Entries added |
| Disable Blocking | Touch ID → Password | Syncs to INACTIVE | Entries removed |
| View Blocked Sites | None | Reads from hosts file | Read-only |
| Force Re-Block | Touch ID → Password | Syncs to ACTIVE | Re-applies entries |

---

## 📝 Test Results Template

Use this to track your testing:

```
✅ Test 1: Status Synchronization - PASS/FAIL
   Notes: _________________

✅ Test 2: Touch ID Auth - PASS/FAIL
   Device: Mac with/without Touch ID
   Notes: _________________

✅ Test 3: Status Persistence - PASS/FAIL
   Notes: _________________

✅ Test 4: Multiple Operations - PASS/FAIL
   Notes: _________________
```

---

## 🎯 Success Indicators

All tests pass if:
- ✅ Status is always accurate in "Manage Blocked Sites"
- ✅ Touch ID appears on supported devices
- ✅ Password fallback works automatically
- ✅ Only one authentication prompt per operation
- ✅ Status persists correctly across restarts
- ✅ Console logs show correct authentication method

---

## 🚀 Ready to Use!

After successful testing:
1. The extension is ready for daily use
2. You can reload it in Raycast with ⌘+R
3. Check Raycast Developer Console for any issues
4. Enjoy faster authentication with Touch ID! 👆
