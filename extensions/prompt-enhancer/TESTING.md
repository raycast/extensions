# Testing Guide

## Setup

1. Start dev server:
```bash
cd /Users/atakan/Desktop/Projeler/RaycastPromptEnhancer
npm run dev
```

2. Open Raycast (⌘+Space)

---

## Test Checklist

### 1. Enhance Prompt Command
- [ ] Type "Enhance Prompt" in Raycast
- [ ] Verify form appears with text area
- [ ] Test auto-clipboard: copy "write code for app" → open command → verify auto-filled
- [ ] Enter a simple prompt: `make a website`
- [ ] Press ⌘+Return to enhance
- [ ] Verify Compare View appears with enhanced prompt

### 2. Compare View
- [ ] Verify original prompt is shown
- [ ] Verify enhanced prompt is shown
- [ ] Verify provider/model/style info is displayed
- [ ] Test "Copy Enhanced Prompt" (⌘+Return)
- [ ] Test "Paste Enhanced Prompt" (⇧⌘+Return) 
- [ ] Test "Copy Original Prompt" (⇧⌘+C)
- [ ] Test "Edit and Retry" (⌘+E) → modify → enhance again

### 3. Model Quick-Switch
- [ ] In Enhance Prompt, open action menu (⌘+K or scroll down)
- [ ] Verify "Quick Switch Model" section with 6 presets
- [ ] Test using "Use GPT-4o Mini" → verify it uses OpenAI
- [ ] Test using "Use Claude 3.5 Sonnet" → verify it uses Anthropic
- [ ] (Note: You need the corresponding API key configured)

### 4. Quick Enhance Selected
- [ ] Select text in any app: `explain quantum computing`
- [ ] Trigger "Quick Enhance Selected" command
- [ ] Verify HUD shows "✨ Enhanced prompt copied!"
- [ ] Paste and verify enhanced prompt

### 5. View History
- [ ] Type "View History" in Raycast
- [ ] Verify previous enhancements appear
- [ ] Test "Copy Enhanced Prompt" on a history item
- [ ] Test "Copy Original Prompt" on a history item
- [ ] Test "Delete" (⌘+Backspace) on an item
- [ ] Verify item is removed
- [ ] Test "Clear All History"

### 6. Use Template Command
- [ ] Type "Use Template" in Raycast
- [ ] Verify 8 templates are shown
- [ ] Select "Code Review" template
- [ ] Enter sample code: `function add(a,b) { return a+b }`
- [ ] Press ⌘+Return to enhance
- [ ] Verify template is applied and enhanced
- [ ] Test "Copy Template Only" (⇧⌘+C) - just copies without AI

### 7. Enhancement Styles
- [ ] Go to Extension Preferences (⌘+,)
- [ ] Change Enhancement Style to "Concise"
- [ ] Enhance a prompt → verify short output
- [ ] Change to "Detailed" → verify comprehensive output  
- [ ] Change to "Technical" → verify code-focused output
- [ ] Change to "Creative" → verify imaginative output

### 8. Multi-Provider Support
- [ ] Test with OpenRouter (default)
- [ ] Switch to Gemini in preferences → add API key → test
- [ ] Switch to OpenAI in preferences → add API key → test
- [ ] Switch to Anthropic in preferences → add API key → test
- [ ] Switch to Groq in preferences → add API key → test
- [ ] (Optional) Test Ollama if you have it running locally

### 9. Custom System Prompt
- [ ] Go to Extension Preferences
- [ ] Add custom instruction: "Always include 3 examples"
- [ ] Enhance a prompt
- [ ] Verify the output includes examples

---

## Test Prompts to Try

| Prompt | Expected Enhancement |
|--------|---------------------|
| `write code` | Detailed request with specifics about language, style, structure |
| `help with email` | Professional email writing with context, tone, format |
| `explain ai` | Clear explanation request with depth level, target audience |
| `fix bug in my app` | Debugging request with expected info like error messages, context |

---

## Error Cases to Test

- [ ] Empty prompt → should show error toast
- [ ] No API key configured → should show appropriate error
- [ ] Invalid API key → should show API error
- [ ] Network offline → should handle gracefully

---

## Notes

Record any issues here:

-
-
-
