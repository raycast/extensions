# Clear Categories Cache

If you see old categories (only 5 showing), you need to clear the cached categories data.

## Option 1: Using Raycast Storage Inspector (Easiest)

1. Open Raycast
2. Search for "Raycast Storage"
3. Find "WebBlocker" extension
4. Delete the `categories` key
5. Reload Raycast (⌘+R)
6. Open "Add Website to Block" - you should now see 40 categories

## Option 2: Manual Clear via Terminal

Run this command to clear WebBlocker's LocalStorage:

```bash
rm -rf ~/Library/Application\ Support/com.raycast.macos/extensions/web-blocker/localStorage.db*
```

Then reload Raycast (⌘+R)

## Option 3: Reinstall Extension

1. Remove WebBlocker from Raycast
2. Reload Raycast
3. Re-import WebBlocker from your development folder

---

## Verify Categories Loaded

After clearing cache:
1. Open "Add Website to Block"
2. Click on "Categories" field
3. You should see 40 categories:
   - Social Media
   - Video Streaming
   - Gaming
   - ... and 37 more

If you still see only 5, the old data is still cached.
