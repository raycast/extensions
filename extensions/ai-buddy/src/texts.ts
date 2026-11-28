import { yourLanguage } from "./language";

/** Labels and buddy guides (US English only); `lang` is the Native Language name used inside them. */
const strings = (lang: string) => ({
  featuresSection: "Buddies",
  runWith: (text: string): string => `Run with: "${text}"`,
  hotkeyHint: "Suggested hotkey",
  inputHint: "Selected text, or type in the search bar",
  settingsSection: "Settings",
  guide: {
    translate: `## 🌐 Buddy Translate
Fast translation with language detection: ${lang} → English, anything else → ${lang}. Tech terms (PR, deploy, ticket…) are kept as they are.

### How to use
1. Select text in any app (Slack, Teams, browser…)
2. Press the hotkey: the result shows with the original

Or type / paste text in the search bar above and press **↵**.

### 🔤 Pronunciation (English side)
- Word / short phrase: a dictionary card with part of speech (n, v…), IPA, meaning, usage and 3 examples
- Sentence: **Vocabulary** in the side panel: part of speech, IPA and meaning
- Listen (⌘L, slowly ⌘⇧L) with the macOS system voice

### In the result
- **↵** Copy translation · **⌘L** Listen to the English side
- Word: **⌘1 ⌘2 ⌘3** listen to each example
- **⌘O** Open Cambridge · **⌘R** Translate again
- Sentence: **⌘B** Continue with… Draft Reply to the message, or Polish English on an English translation

### Model and prompt
In AI Buddy, on this buddy: **⌘M** Choose Model · **⌘E** Edit Prompt`,
    reply: `## ↩️ Buddy Draft Reply
Suggests a reply to a message, in the language of that message. To always reply in English: Settings → expand **AI Buddy** → **Buddy Draft Reply** → **Reply Language**.

### How to use
1. Select the message (or the last few, for context)
2. Press the hotkey: the suggested reply shows and can be edited
3. Not quite right? Type the key point in **💡 Idea** (${lang} is fine) and press **⌘↵**. Each idea revises the current version.

### In the result
- **⌘↵** Copy the reply (or apply the idea, once one is typed)
- **⌘B** Continue with… Translate, to check the reply in ${lang}
- **⌘R** Start over

### Model and prompt
In AI Buddy, on this buddy: **⌘M** Choose Model · **⌘E** Edit Prompt`,
    rewrite: `## ✏️ Buddy Polish English
Rewrites an English draft into correct, natural English. Plus **📘 Lessons**: the mistakes fixed and the grammar rules behind them.

### How to use
1. Type the draft in the chat box and select it
2. Press the hotkey: the rewrite shows and can be edited
3. Want to add a point or change the tone? Type it in **💡 Idea** and press **⌘↵**
4. **⌘↵** replaces the selected draft with the new version

### ⚡ Quick Replace
Turn it on in Settings: expand **AI Buddy**, select **Buddy Polish English**, tick **Quick Replace** (**⌘⇧R** here opens Settings). When on, the hotkey replaces the selected draft right away: no result view, no lessons. **⌘Z** in the app undoes it.

### In the result
- **⌘↵** Replace draft (or apply the idea, once one is typed)
- **⌘⇧C** Copy
- **⌘B** Continue with… Translate, to check the new version in ${lang}
- **⌘R** Start over

### Model and prompt
In AI Buddy, on this buddy: **⌘M** Choose Model · **⌘E** Edit Prompt`,
  },
  settingsGuide: `## ⚙️ Settings
**The AI** (provider, API key, model): the **Connection** row at the top → **AI Setup**. It checks the key while you type.

Press **↵** here for AI Buddy's settings in Raycast:

- **Native Language** - ${lang} now: Translate goes English ⇄ it; meanings and lessons use it
- **Speed** - skip model thinking for faster answers
- **Reply Language** - under Buddy Draft Reply: match their language, or always English
- **Quick Replace** - under Buddy Polish English: the hotkey replaces the draft in the chat box right away
- **Hotkey** - assign a hotkey to each command in the right column
- **Voice** - the macOS system voice (Accessibility → Read & Speak)

### Data on this Mac
- **Looked-up words** (meaning, IPA, usage, examples) - kept so they show instantly next time ⚡
- **Edited prompts** - \`prompts.json\`
- ⌘K → **Show Data Folder** to view · **Clear Dictionary Cache** to delete

Suggested hotkeys: **⌃⌘T** Translate · **⌃⌘R** Draft Reply · **⌃⌘E** Polish English`,

  instructions: "Instructions",
  formNoteTitle: "Note",
  formNote:
    "Describe the role, tone, rules and examples. The answer format is handled for you. Save empty = use the default. ⌘↵ to save.",

  ideaPlaceholder: {
    reply: "Input idea (e.g. not yet, will send at 9am), then ⌘↵",
    rewrite: "Input idea (e.g. add a point, more polite), then ⌘↵",
  },
  applied: "Applied",
  direction: "Direction",
  vocabulary: "Vocabulary",
  usage: "Usage",
  phrases: "Common phrases",
  examples: "Examples",
  listenHint: (keys: string): string => `${keys} to listen to each one`,
  clipped: (max: string): string => `Text too long: only the first ${max} characters are sent`,
  insecure: "API Host uses http://: the API key and your text are sent unencrypted",
  insecureShort: "⚠️ http, not encrypted",
});

/** Read on each render, so a Native Language change shows on reopen. */
export const texts = () => strings(yourLanguage().name);
