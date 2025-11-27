# Screenshot Checklist for Raycast Store

## 📸 Required Screenshots

Place all screenshots in the `metadata/` folder.

### 1. Demo GIF (Highly Recommended)
**Filename:** `mock-data-generator-demo.gif`

**What to capture:**
- Open Raycast and search for the extension
- Show the form with some fields filled in
- Add a new field
- Generate the code (Cmd+G)
- Show the preview
- Copy to clipboard (Cmd+C)
- Close/go back to form

**Tips:**
- Keep it under 10 seconds
- Use a tool like Kap, ScreenFlow, or Raycast's built-in GIF recorder
- Show the keyboard shortcuts in action

---

### 2. Form View Screenshot
**Filename:** `screenshot-form.png`

**What to capture:**
- The main form with:
  - Language dropdown (Java or Python selected)
  - Output format dropdown
  - Class name field filled in (e.g., "User")
  - 3-4 fields visible with different types
  - Make sure the ActionPanel is visible (if possible)

**Setup:**
- Fill in a meaningful example (User class with id, username, email, isActive)
- Use different field types to show variety
- Make sure the form looks clean and professional

---

### 3. Preview View Screenshot
**Filename:** `screenshot-preview.png`

**What to capture:**
- The code preview showing generated code
- Syntax highlighting visible
- ActionPanel with Copy/Paste/Back actions
- A complete, readable example (Java POJO or Python Dataclass)

**Setup:**
- Generate a clean example (User class works well)
- Make sure the code is fully visible
- Show the ActionPanel options

---

## 📋 Optional (But Nice to Have)

### 4. Template Loading
**Filename:** `screenshot-templates.png`
- Show the ActionPanel with template options visible
- Demonstrates the quick template feature

### 5. Multiple Languages
**Filename:** `screenshot-languages.png`
- Side-by-side or collage showing Java and Python outputs
- Demonstrates multi-language support

---

## 🎨 Screenshot Tips

1. **Resolution**: Use at least 1280x720 or higher
2. **Theme**: Use a clean theme (Raycast Light or Dark)
3. **Content**: Use realistic, professional examples
4. **Crop**: Remove unnecessary UI elements, focus on the extension
5. **Format**: 
   - PNG for screenshots
   - GIF for demo (under 5MB if possible)

---

## ✅ When You're Done

Update the README.md placeholders:
- Replace `metadata/mock-data-generator-demo.gif` with your actual GIF
- Replace `metadata/screenshot-form.png` with your form screenshot
- Replace `metadata/screenshot-preview.png` with your preview screenshot

Then you're ready to publish! 🚀
