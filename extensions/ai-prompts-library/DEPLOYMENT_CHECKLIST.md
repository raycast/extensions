# Deployment Checklist for Raycast Store

Author: **TomsTools**
Extension: **AI Prompts Library**

---

## ✅ Pre-Deployment Checklist

### 1. Initial Setup & Testing

**Step 1: Fix npm permissions** (if you haven't already)
```bash
sudo chown -R $(whoami) "/Users/$(whoami)/.npm"
```

**Step 2: Install dependencies**
```bash
cd /Users/tpanos/Desktop/Builds/raycast-extension
npm install
```

**Step 3: Test in development mode**
```bash
npm run dev
```

**Step 4: Manual testing in Raycast**
- [ ] Open Raycast (⌘Space)
- [ ] Search for "Search AI Prompts"
- [ ] Test search functionality
- [ ] Test category dropdown filter
- [ ] Test "Paste to Active App" action
- [ ] Test "Copy to Clipboard" action
- [ ] Test "View Full Prompt" detail view
- [ ] Verify all ~14,000 prompts load correctly
- [ ] Check that categories are properly assigned
- [ ] Test with different apps (paste functionality)

---

### 2. Metadata Review

**Package.json** ✅ COMPLETE
- [x] Author: "TomsTools"
- [x] Categories: ["Productivity", "Developer Tools"]
- [x] License: "MIT"
- [x] Title: "AI Prompts Library"
- [x] Description: Clear and descriptive
- [x] Icon: command-icon.png (512x512px)
- [x] Latest Raycast API version

**Documentation** ✅ COMPLETE
- [x] README.md with full documentation
- [x] CHANGELOG.md with version 1.0.0
- [x] SETUP_INSTRUCTIONS.md
- [x] .gitignore configured

---

### 3. Build & Quality Checks

**Step 5: Run production build**
```bash
npm run build
```
- [ ] Build completes without errors
- [ ] Check terminal output for warnings

**Step 6: Run linter**
```bash
npm run lint
```
- [ ] No linting errors
- [ ] If errors exist, run: `npm run fix-lint`

**Step 7: Final code review**
- [ ] No console.log statements left in code
- [ ] No TODO comments unresolved
- [ ] Error handling in place
- [ ] Toast notifications working
- [ ] Loading states working
- [ ] Empty states working

---

### 4. Store Assets (REQUIRED BEFORE PUBLISHING)

**Screenshots** ⚠️ NEEDED
You need 2-6 screenshots at **2000x1250px** (landscape) showing:
- [ ] Main search interface with prompts listed
- [ ] Category dropdown filter in action
- [ ] Search results for a query
- [ ] Actions panel showing Copy/Paste options
- [ ] (Optional) Detail view of a prompt
- [ ] (Optional) Different categories displayed

**How to create screenshots:**
1. Open the extension in Raycast
2. Use macOS built-in screenshot tool (⌘⇧5)
3. Capture the Raycast window at different states
4. Resize to 2000x1250px using Preview or an image editor
5. Save in a folder for uploading during publish

**Screenshot Tips:**
- Use consistent background (clean desktop)
- Show real prompts from your library
- Hide any sensitive/personal information
- Make sure text is readable
- Show the extension in action (not just empty states)

---

### 5. Publishing to Raycast Store

**Step 8: Publish the extension**
```bash
npm run publish
```

**What happens:**
1. You'll be prompted to authenticate with GitHub
2. The CLI will create a pull request to Raycast's extensions repository
3. Your extension will be submitted for review

**Step 9: During review**
- Monitor the GitHub PR for comments from Raycast team
- They may request changes or improvements
- You can push updates by running `npm run publish` again
- Be responsive to feedback

**Step 10: After approval**
- Extension automatically published to Raycast Store
- Users can find it by searching "AI Prompts Library"
- You can share the extension link from Raycast

---

## 📋 Quick Command Reference

```bash
# Development
npm run dev              # Start development mode with hot reload

# Testing
npm run build            # Production build test
npm run lint             # Check for code issues
npm run fix-lint         # Auto-fix linting issues

# Publishing
npm run publish          # Submit to Raycast Store
```

---

## 🎯 Current Status

**Completed:**
- ✅ Extension code complete
- ✅ Author set to "TomsTools"
- ✅ Categories configured
- ✅ Icon created
- ✅ Documentation written
- ✅ CHANGELOG created

**Remaining:**
- ⚠️ Fix npm permissions (if not done)
- ⚠️ Install dependencies
- ⚠️ Test locally with `npm run dev`
- ⚠️ Run `npm run build` validation
- ⚠️ Run `npm run lint` check
- ⚠️ Create 2-6 screenshots (2000x1250px)
- ⚠️ Run `npm run publish`

---

## 🆘 Troubleshooting

**Build fails:**
- Check TypeScript errors in terminal
- Verify all imports are correct
- Check that CSV file is in correct location

**Lint errors:**
- Run `npm run fix-lint` to auto-fix
- Manually fix any remaining issues shown

**Extension doesn't appear in Raycast:**
- Make sure `npm run dev` is still running
- Quit and restart Raycast (⌘Q)
- Check terminal for error messages

**Publish fails:**
- Ensure you're authenticated with GitHub
- Check you have a Raycast account
- Verify username matches "TomsTools"

---

## 📞 Support

- Raycast Docs: https://developers.raycast.com/
- Raycast Community: https://raycast.com/community
- Extensions Repo: https://github.com/raycast/extensions

---

**Next Step:** Run the setup commands and test the extension locally!
