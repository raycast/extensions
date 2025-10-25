# 🚀 Ready to Publish Your Private Extension!

Your **Notion Task Manager** extension is ready to publish!

## ⚠️ Before Publishing - Fix npm Cache Issue

First, fix the npm cache permission issue by running this in your terminal:

```bash
sudo chown -R 501:20 "$HOME/.npm"
```

This is a one-time fix for an npm cache permissions issue.

## 🎯 Publishing as Private Extension

### Step 1: Open Your Terminal

Navigate to your extension directory:
```bash
cd /Users/iroshandezilva/Projects/raycast-notion-todo/notion-to-do
```

### Step 2: Login to Raycast (if needed)

Check if you're logged in:
```bash
npx @raycast/api@latest whoami
```

If not logged in, authenticate:
```bash
npx @raycast/api@latest login
```

### Step 3: Publish as Unlisted (Private)

Run the publish command:
```bash
npm run publish
```

When prompted:
1. **Visibility**: Choose **"Unlisted"** (this keeps it private!)
2. **Description**: Already set - just confirm
3. **Screenshots**: Optional - skip for now or add later
4. **Category**: Already set to "Productivity"
5. **Submit**: Confirm submission

### Step 4: Wait for Review

- Raycast team will review (usually 24-48 hours)
- You'll get an email when approved
- Once approved, you'll get a private URL

### Step 5: Share Your Private Extension

After approval:
1. You'll receive a private URL like: `https://raycast.com/iroshandezilva/notion-to-do`
2. Share this URL only with people you want to give access to
3. They can install with one click!

## 🔄 Updating Your Extension

To push updates later:
1. Update version in `package.json` (e.g., 1.0.1)
2. Update `CHANGELOG.md`
3. Run `npm run build`
4. Run `npm run publish` again

## 📊 What's Included in v1.0.0

✅ 9 Commands:
- Create Task (with Markdown support & smart project selection)
- Update Task
- Daily Overview
- Search Tasks (with AI natural language)
- Menu Bar Summary
- Smart Task Creation (AI)
- Task Breakdown (AI)
- Smart Prioritization (AI)
- AI Task Summary

✅ Features:
- Raycast Pro AI support (no API key needed!)
- OpenAI fallback option
- Markdown/MDX in descriptions
- Smart defaults
- Keyboard shortcuts
- Auto-refresh menu bar

## 🆘 Troubleshooting

**"Not logged in" error:**
```bash
npx @raycast/api@latest login
```

**npm permission errors:**
```bash
sudo chown -R 501:20 "$HOME/.npm"
```

**Want to test first?**
```bash
npm run dev
```

## 📚 Resources

- [Raycast Publishing Guide](https://developers.raycast.com/basics/publish-an-extension)
- [Raycast Store Guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Your Extension Repo](file:///Users/iroshandezilva/Projects/raycast-notion-todo/notion-to-do)

---

## 🎉 Ready?

1. Fix npm cache: `sudo chown -R 501:20 "$HOME/.npm"`
2. Publish: `npm run publish`
3. Choose **Unlisted**
4. Get your private link!

Your extension is professional, well-documented, and ready to share! 🚀

