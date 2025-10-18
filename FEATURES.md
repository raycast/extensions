# WebBlocker - Features Documentation

## ✅ New Features Implemented

### 1. **Categories/Tags for Websites**
Organize your blocked websites with categories for easy filtering and management.

**Features:**
- Default categories: Social Media, Video Streaming, News, Gaming, Shopping
- Category filter dropdown in Manage Blocked Sites
- Visual category tags on each domain
- Bulk category assignment

**Usage:**
- When adding a website, select categories from the dropdown
- In Manage Blocked Sites, use the category filter to view specific groups
- Select multiple domains (⌘+S) and bulk assign categories

---

### 2. **Schedule Modes**
Choose how scheduling affects blocking with an easy dropdown menu.

**Three Modes:**
- **Block only during schedule** - Block DURING specified hours
- **Allow only during schedule (Whitelist)** - Block EXCEPT during specified hours
- **Block at all times** - Always block, ignore schedule times

**Examples:**
- Allow YouTube only from 7-10 PM → Use "Allow only during schedule"
- Block social media only during work hours (9-5) → Use "Block only during schedule"
- Always block with schedule info saved → Use "Block at all times"

**Usage:**
1. Add/edit website
2. Enable "Schedule blocking times"
3. Set time range and days
4. Choose mode from "Schedule Mode" dropdown

---

### 3. **Import/Export (Integrated)**
Backup and share your block list configuration.

**Location:** Inside "Manage Blocked Sites"

**Keyboard Shortcuts:**
- **⌘⇧E** - Export block list
- **⌘⇧I** - Import from clipboard

**Export:**
- Saves to `~/Downloads/webblocker-export-YYYY-MM-DD.json`
- Automatically copies JSON to clipboard
- Includes: domains, categories, schedules, settings

**Import:**
- Copy JSON data to clipboard first
- Press ⌘⇧I in Manage Blocked Sites
- Merges with existing data (doesn't replace)

---

### 4. **Bulk Actions**
Perform actions on multiple domains at once.

**Available Actions:**
- Bulk Enable/Disable
- Bulk Delete
- Bulk Category Assignment
- Clear Selection

**Usage:**
1. Open "Manage Blocked Sites"
2. Press ⌘+S on domains to select them (blue checkmark appears)
3. Click the "Bulk Actions" item that appears at the top
4. Choose your action

---

## 🎯 All Commands

1. **Add Website to Block** - Add domains with categories and schedules
2. **Enable Website Blocking** - Activate blocking
3. **Disable Website Blocking** - Deactivate blocking
4. **Manage Blocked Sites** - View, edit, bulk actions, import/export
5. **Force Re-Block & Fix** - Troubleshoot blocking issues

---

## ⌨️ Keyboard Shortcuts

### In "Manage Blocked Sites"
- **⌘+S** - Select/deselect domain
- **⌘+T** - Toggle domain enable/disable
- **⌘+E** - Edit schedule
- **⌘+⌫** - Delete domain
- **⌘⇧E** - Export block list
- **⌘⇧I** - Import from clipboard

---

## 📁 Default Categories (40 total)

**Social & Communication:**
- Social Media
- Messaging & Chat
- Dating
- Forums & Communities

**Entertainment:**
- Video Streaming
- Streaming Services
- Music & Podcasts
- Gaming
- Memes & Humor

**Shopping & Commerce:**
- Shopping
- E-commerce
- Marketplaces
- Fashion & Beauty
- Food & Cooking
- Travel & Booking

**Finance & Money:**
- Finance & Banking
- Cryptocurrency
- Stock Trading
- Gambling
- Betting & Casinos

**Work & Productivity:**
- Work Distractions
- Productivity Tools
- Email
- Development Tools
- Design & Creative
- Photo & Video Editing
- Cloud Storage
- AI Tools

**Information & Learning:**
- News & Media
- Sports
- Education
- Research
- Blogs & Personal Sites
- Politics

**Lifestyle:**
- Health & Fitness
- Religion & Spirituality
- Job Search
- Adult Content

**General:**
- Entertainment
- Other

---

## 🚀 Quick Workflows

### Add Website with Category
```
1. Raycast → "Add Website to Block"
2. Enter domain: youtube.com
3. Select category: Video Streaming
4. Optional: Add schedule
5. Submit
```

### Export Your Configuration
```
1. Open "Manage Blocked Sites"
2. Press ⌘⇧E
3. File saved to ~/Downloads/webblocker-export-YYYY-MM-DD.json
4. JSON also copied to clipboard
```

### Import Configuration
```
1. Copy exported JSON to clipboard
2. Open "Manage Blocked Sites"
3. Press ⌘⇧I
4. Confirm merge
```

### Bulk Organize Domains
```
1. Open "Manage Blocked Sites"
2. Select multiple domains with ⌘+S
3. "Bulk Actions" appears at top
4. Choose: Enable/Disable/Assign Category/Delete
```

### Whitelist Example: Allow YouTube 7-10 PM Only
```
1. Add youtube.com
2. Enable schedule: 19:00 - 22:00, Daily
3. Check "Block only during schedule"
4. Check "Whitelist mode"
5. Result: YouTube blocked all day EXCEPT 7-10 PM
```

---

## 💾 Export JSON Format

```json
{
  "version": "1.0.0",
  "exportDate": "2025-10-17T...",
  "domains": [
    {
      "domain": "youtube.com",
      "categories": ["Video Streaming"],
      "isEnabled": true,
      "dateAdded": "2025-10-17T...",
      "schedule": {
        "enabled": true,
        "startTime": "19:00",
        "endTime": "22:00",
        "days": [0,1,2,3,4,5,6],
        "scheduleOnly": true,
        "isWhitelist": true
      }
    }
  ],
  "categories": [
    { "name": "Social Media", "icon": "👥" }
  ],
  "settings": {
    "defaultUnblockDuration": 10
  }
}
```

---

## 🔧 Technical Details

### Storage Keys
- `blocked-domains` - All blocked domains
- `blocking-status` - Current blocking state
- `categories` - Category definitions
- `settings` - Extension settings

### New Interfaces
```typescript
interface BlockedDomain {
  domain: string;
  categories?: string[];  // NEW
  schedule?: BlockingSchedule;
  // ... other fields
}

interface BlockingSchedule {
  enabled: boolean;
  isWhitelist?: boolean;  // NEW
  // ... other fields
}
```

---

## ✅ Build Status

- **TypeScript:** ✅ Success
- **Commands:** 5 total
- **Features:** Categories, Whitelist Hours, Bulk Actions, Import/Export
- **Lines Added:** ~1000+

---

## 🎯 Pro Tips

1. **Use Categories Early** - Organize as you add websites
2. **Export Weekly** - Keep backups of your configuration
3. **Whitelist Mode** - Perfect for "allow only during X hours" scenarios
4. **Bulk Actions** - Select with ⌘+S, then use bulk actions
5. **⌘⇧I/E** - Quick access to import/export

---

## 📖 Getting Started

1. **Reload Raycast:** ⌘+R
2. **Add Websites:** With categories
3. **Try Export:** ⌘⇧E to backup
4. **Use Bulk Actions:** Select multiple and organize
5. **Test Whitelist:** Create a schedule with whitelist mode

---

## ❓ Troubleshooting

### Export Not Working
- Check Downloads folder permissions
- Try again, it will save to `~/Downloads/`
- JSON is always copied to clipboard as backup

### Import Not Working
- Make sure JSON is in clipboard
- Must be valid exported JSON format
- If error, export first to see correct format

### Categories Not Showing
- Reload Raycast (⌘+R)
- Categories load from storage on startup

---

All features ready to use! 🚀
