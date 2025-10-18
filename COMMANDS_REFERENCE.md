# WebBlocker Extension - Complete Command Reference

## Available Commands 🎯

### 1. Add Website to Block ➕
**Command:** `Add Website to Block`  
**Icon:** ➕  
**Mode:** View

**Purpose:** Add websites to your blocking list

**Features:**
- Add domains or full URLs
- Automatic www/non-www handling
- URL normalization (strips paths, protocols, ports)
- Optional notes for each website
- Duplicate detection
- Visual feedback

**Usage:**
1. Run command
2. Enter domain or URL (e.g., youtube.com or https://www.youtube.com/watch?v=xyz)
3. Optionally add notes
4. Confirm

**Example:**
```
Input: https://www.youtube.com/watch?v=12345
Output: Blocks both youtube.com and www.youtube.com
```

---

### 2. Enable Website Blocking 🚫
**Command:** `Enable Website Blocking`  
**Icon:** 🚫  
**Mode:** No-view (quick action)

**Purpose:** Activate blocking for all websites in your list

**Features:**
- Single password prompt
- Modifies /etc/hosts file
- Clears DNS caches
- Cycles network connections
- **🔄 Auto-refreshes browser tabs for 5 seconds**
- Blocks both www and non-www variants

**Usage:**
1. Run command
2. Review confirmation dialog
3. Enter admin password once
4. Wait for completion (~10 seconds)

**What Happens:**
```
1. Hosts file updated with blocking entries
2. DNS caches flushed aggressively  
3. Network connections cycled
4. Browser tabs auto-refresh for 5 seconds
5. All blocked sites become immediately inaccessible
```

**Success Message:**
> ✅ Blocking active! Open tabs are being automatically refreshed for immediate effect

---

### 3. Disable Website Blocking ✅
**Command:** `Disable Website Blocking`  
**Icon:** ✅  
**Mode:** No-view (quick action)

**Purpose:** Deactivate blocking and restore access to all websites

**Features:**
- Uses cached authentication (may not need password)
- Removes blocking entries from hosts file
- Clears DNS caches
- Cycles network connections
- **🔄 Auto-refreshes browser tabs for 5 seconds**
- Restores access to all sites

**Usage:**
1. Run command
2. Review confirmation dialog
3. Enter password if needed (or uses cached auth)
4. Wait for completion (~10 seconds)

**What Happens:**
```
1. Blocking entries removed from hosts file
2. DNS caches flushed
3. Network connections cycled
4. Browser tabs auto-refresh for 5 seconds
5. All sites become immediately accessible
```

**Success Message:**
> 🎉 All websites unblocked! Open tabs are being automatically refreshed

---

### 4. Manage Blocked Sites 📋
**Command:** `Manage Blocked Sites`  
**Icon:** 📋  
**Mode:** View

**Purpose:** View and manage your blocked websites list

**Features:**
- View all blocked domains
- See date added
- View notes for each site
- Remove individual sites
- See current blocking status (ACTIVE/INACTIVE)
- Quick actions for each site

**Usage:**
1. Run command
2. Browse your list
3. Select a site to remove (optional)
4. Confirm removal

**Display:**
```
🚫 youtube.com
   Added: Jan 15, 2025
   Notes: Productivity blocker

🚫 facebook.com
   Added: Jan 14, 2025
   
Status: ACTIVE (blocking enabled)
```

---

### 5. Refresh & Fix Blocking 🔄 **NEW!**
**Command:** `Refresh & Fix Blocking`  
**Icon:** 🔄  
**Mode:** No-view (quick action)

**Purpose:** Force-refresh all blocking mechanisms to fix issues

**Features:**
- **No admin password required**
- Clears all DNS caches
- Cycles network connections
- Immediately refreshes browser tabs
- Fixes inconsistent blocking
- Works with existing configuration

**Usage:**
1. Run command
2. Review confirmation dialog
3. Confirm action
4. Wait for completion (~3-5 seconds)

**When to Use:**
- ✅ Site not blocking properly
- ✅ DNS changes not taking effect
- ✅ Browser showing cached content
- ✅ Inconsistent blocking across tabs
- ✅ After system wake from sleep
- ✅ General troubleshooting

**What Happens:**
```
Step 1/3: Clearing DNS caches...
Step 2/3: Cycling network connections...
Step 3/3: Refreshing browser tabs...
✅ Done! Any issues should now be fixed
```

---

## Command Comparison Matrix 📊

| Feature | Add Website | Enable | Disable | Manage | Refresh |
|---------|------------|--------|---------|--------|---------|
| **Requires Password** | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Modifies Hosts** | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Clears DNS** | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Cycles Network** | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Refreshes Tabs** | ❌ | ✅ (5s) | ✅ (5s) | ❌ | ✅ (once) |
| **View Mode** | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Duration** | Instant | ~10s | ~10s | Instant | ~3-5s |

---

## Typical Workflow 🔄

### Initial Setup
```
1. Add Website to Block (youtube.com)
2. Add Website to Block (facebook.com)
3. Add Website to Block (twitter.com)
4. Enable Website Blocking
   → Enter password
   → Tabs auto-refresh
   → Sites blocked immediately
```

### Daily Use
```
Morning:
  → Enable Website Blocking
  → Auto-refresh ensures blocking

Evening:
  → Disable Website Blocking
  → Auto-refresh restores access
```

### Troubleshooting
```
If site not blocking:
  → Run: Refresh & Fix Blocking
  → Wait 3 seconds
  → Issue resolved
```

### Managing List
```
Weekly review:
  → Open: Manage Blocked Sites
  → Remove outdated sites
  → Add new distractions
```

---

## Quick Access Tips 💡

### Raycast Shortcuts
Set up aliases for quick access:
- `block` → Enable Website Blocking
- `unblock` → Disable Website Blocking
- `fix` → Refresh & Fix Blocking
- `sites` → Manage Blocked Sites
- `add` → Add Website to Block

### Hotkeys (Optional)
Configure in Raycast:
- `⌘⌥B` → Enable Blocking
- `⌘⌥U` → Disable Blocking
- `⌘⌥R` → Refresh & Fix

---

## Command Decision Tree 🌳

```
Need to block a new site?
  → Add Website to Block

Want to activate blocking?
  → Enable Website Blocking

Want to deactivate blocking?
  → Disable Website Blocking

Site not blocking properly?
  → Refresh & Fix Blocking

Want to see/edit your list?
  → Manage Blocked Sites
```

---

## Auto-Refresh Feature Summary 🔄

**Commands with Auto-Refresh:**
1. ✅ Enable Website Blocking (5 seconds)
2. ✅ Disable Website Blocking (5 seconds)
3. ✅ Refresh & Fix Blocking (once)

**Supported Browsers:**
- ✅ Safari
- ✅ Google Chrome
- ✅ Arc
- ✅ Microsoft Edge
- ❌ Firefox (AppleScript limitations)

**How It Works:**
- Detects running browsers automatically
- Refreshes only tabs matching blocked domains
- Handles www/non-www variants
- Runs in background (non-blocking)
- No manual refresh needed (⌘⇧R)

---

## Troubleshooting Guide 🔍

### Blocking Not Working
1. Check domain in list: `Manage Blocked Sites`
2. Verify blocking is enabled (should see ACTIVE status)
3. Run: `Refresh & Fix Blocking`
4. If still not working: Disable → Re-enable blocking

### Auto-Refresh Not Working
1. Check browser is supported (not Firefox)
2. Verify Raycast has accessibility permissions
3. Ensure browser is running
4. Check console for errors

### Password Prompt Every Time
1. This is normal for Enable/Disable commands
2. macOS security requires password for hosts file changes
3. Use Refresh & Fix if you just need to refresh (no password)

### DNS Changes Not Taking Effect
1. Run: `Refresh & Fix Blocking`
2. Wait full 5 seconds during auto-refresh
3. If persistent: Restart browser

---

## Best Practices ✨

### Daily Usage
- ✅ Enable blocking at start of work
- ✅ Disable blocking at end of day
- ✅ Use Refresh & Fix only when needed
- ✅ Review blocked list weekly

### Adding Websites
- ✅ Use full URLs (auto-normalizes)
- ✅ Add notes for context
- ✅ Block both social media and time-wasters
- ✅ Start with obvious distractions

### Performance
- ✅ Keep block list under 50 sites
- ✅ Don't run commands repeatedly
- ✅ Wait for completion before next action
- ✅ Use Refresh sparingly (only when needed)

---

## All Commands at a Glance 🎯

```
┌──────────────────────────────────────────────────┐
│  WEBBLOCKER EXTENSION - COMMAND SUITE            │
├──────────────────────────────────────────────────┤
│                                                  │
│  ➕ Add Website to Block                        │
│     → Add domains to your blocking list          │
│                                                  │
│  🚫 Enable Website Blocking                     │
│     → Activate blocking + auto-refresh (5s)      │
│                                                  │
│  ✅ Disable Website Blocking                    │
│     → Deactivate blocking + auto-refresh (5s)    │
│                                                  │
│  📋 Manage Blocked Sites                        │
│     → View and edit your blocked list            │
│                                                  │
│  🔄 Refresh & Fix Blocking ★ NEW                │
│     → Troubleshoot and fix blocking issues       │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Summary 📝

The WebBlocker extension provides a complete suite of commands for managing website blocking:

1. **Add/Manage** - Build and maintain your block list
2. **Enable/Disable** - Control blocking with auto-refresh
3. **Refresh & Fix** - Troubleshoot when issues occur

**Key Innovation:** Automatic browser tab refreshing ensures immediate effect without manual intervention. No more ⌘⇧R needed!

**Supported Platforms:** macOS with Raycast  
**Supported Browsers:** Safari, Chrome, Arc, Edge  
**Admin Access:** Required for Enable/Disable (hosts file modification)  
**User Experience:** Seamless, instant, effortless  

---

**For detailed documentation:**
- Auto-Refresh Feature: See `AUTO_REFRESH_FEATURE.md`
- Refresh Command: See `REFRESH_COMMAND_GUIDE.md`
- Quick Testing: See `AUTO_REFRESH_TEST_GUIDE.md`
