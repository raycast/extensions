# Denshobato - Development Specification

## 📋 Project Overview

### Background & Problem
- Terminal applications like Zed Editor experience character corruption and input issues when using IME (Japanese, Chinese, Korean, etc.)
- Difficulty inputting multibyte characters when using CLI tools like Claude Code
- Existing workarounds (using external terminals) are inefficient

### Solution
- Provide multi-line IME input interface as a Raycast Extension
- Reliably send text strings to terminal applications via clipboard
- Improve efficiency through input history functionality

### Application Name
- **Package name**: `denshobato`
- **Display name**: `Denshobato`
- **Concept**: Like a carrier pigeon (denshobato) that faithfully delivers messages

---

## 🛠 Technical Specifications

### Platform
- **Raycast Extensions API** (React + TypeScript + Node.js)
- **Target OS**: macOS
- **Required Version**: Raycast 1.50.0+

### Core Features
1. **Multi-line text input** - Using `Form.TextArea` component
2. **Clipboard-based sending** - Execute cmd+v via AppleScript
3. **Input history management** - Store latest 10 entries in local storage
4. **Real-time character count** - Feedback during input
5. **Error handling** - Proper notifications for send failures

### Architecture
```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Raycast UI     │ -> │  Clipboard   │ -> │  Terminal App   │
│  (Form.TextArea)│    │  (Backup &   │    │  (cmd+v paste)  │
│                 │    │   Restore)   │    │                 │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

---

## 🎨 UI/UX Design

### Main Screen
```
┌─────────────────────────────────────────┐
│ Denshobato                              │
├─────────────────────────────────────────┤
│ 📝 IME Text                             │
│ ┌─────────────────────────────────────┐ │
│ │ Enter multi-line IME text...        │ │
│ │                                     │ │
│ │ Example:                            │ │
│ │ This is line 1.                     │ │
│ │ This is line 2.                     │ │
│ │ Hello, world!                       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 📊 Character count: 42 characters      │
│                                         │
│ ℹ️  Usage                               │
│ • Enter multi-line IME text            │
│ • cmd+Enter to send to active terminal │
│ • Automatically pastes via clipboard   │
└─────────────────────────────────────────┘

Actions:
• 🚀 Send (cmd+Enter)
• 🗑️ Clear (cmd+K) 
• 📚 History (latest 10 items)
```

### Action Panel
- **Main Action**: Send (`cmd+Enter`)
- **Sub Actions**: Clear, History selection
- **History**: Reuse previous inputs

---

## 📁 File Structure

```
denshobato/
├── package.json           # Package configuration & metadata
├── README.md              # Store description
├── CHANGELOG.md           # Change history
├── assets/
│   ├── icon.png          # 512x512px icon
│   └── icon@dark.png     # Dark theme icon
├── src/
│   ├── index.tsx         # Main component
│   ├── utils/
│   │   ├── clipboard.ts  # Clipboard operations
│   │   ├── storage.ts    # Local storage
│   │   └── applescript.ts# AppleScript execution
│   └── types/
│       └── index.ts      # Type definitions
├── .gitignore
├── .eslintrc.js
└── tsconfig.json
```

---

## 💻 Implementation Design

### 1. Main Component (src/index.tsx)

```typescript
import { ActionPanel, Action, Form, showHUD, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { sendToTerminal } from "./utils/clipboard";
import { getHistory, saveToHistory } from "./utils/storage";

interface FormValues {
  imeText: string;
}

export default function Denshobato() {
  const [text, setText] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    const savedHistory = await getHistory();
    setHistory(savedHistory);
  }

  async function handleSubmit(values: FormValues) {
    if (!values.imeText.trim()) {
      await showHUD("❌ Please enter text");
      return;
    }

    setIsLoading(true);
    try {
      await sendToTerminal(values.imeText);
      await saveToHistory(values.imeText);
      await loadHistory();
      await showHUD("🕊️ Message sent successfully!");
      setText(""); // Clear after sending
    } catch (error) {
      console.error("Send failed:", error);
      await showHUD("❌ Failed to send message");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClear() {
    setText("");
    await showHUD("🗑️ Cleared");
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm
              title="Send"
              icon={Icon.Terminal}
              onSubmit={handleSubmit}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
            <Action
              title="Clear"
              icon={Icon.Trash}
              onAction={handleClear}
              shortcut={{ modifiers: ["cmd"], key: "k" }}
            />
          </ActionPanel.Section>
          
          {history.length > 0 && (
            <ActionPanel.Section title="History">
              {history.map((item, index) => (
                <Action
                  key={index}
                  title={`${item.slice(0, 50)}${item.length > 50 ? "..." : ""}`}
                  icon={Icon.Clock}
                  onAction={() => setText(item)}
                />
              ))}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="imeText"
        title="IME Text"
        placeholder={`Enter multi-line IME text...\n\nExample:\nThis is line 1.\nThis is line 2.\nHello, world!`}
        value={text}
        onChange={setText}
        info="cmd+Enter to send, cmd+K to clear"
      />
      
      <Form.Description
        title="Character Count"
        text={`${text.length} characters${text.includes('\n') ? ` (${text.split('\n').length} lines)` : ''}`}
      />
      
      <Form.Description
        title="Usage"
        text="• Enter multi-line IME text\n• cmd+Enter to send to active terminal\n• Automatically pastes via clipboard"
      />
    </Form>
  );
}
```

### 2. Clipboard Operations (src/utils/clipboard.ts)

```typescript
import { Clipboard } from "@raycast/api";
import { execAppleScript } from "./applescript";

export async function sendToTerminal(text: string): Promise<void> {
  // Backup current clipboard content
  const originalClipboard = await Clipboard.read();
  
  try {
    // Set text to clipboard
    await Clipboard.copy(text);
    
    // Execute cmd+v via AppleScript
    await execAppleScript(`
      tell application "System Events"
        keystroke "v" using command down
      end tell
    `);
    
    // Wait briefly then restore original clipboard
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (originalClipboard.text) {
      await Clipboard.copy(originalClipboard.text);
    } else if (originalClipboard.file) {
      // Don't restore files (technical limitation)
      console.log("File in clipboard - not restoring");
    }
    
  } catch (error) {
    // Restore original clipboard on error
    if (originalClipboard.text) {
      await Clipboard.copy(originalClipboard.text);
    }
    throw error;
  }
}
```

### 3. AppleScript Execution (src/utils/applescript.ts)

```typescript
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function execAppleScript(script: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(`osascript -e '${script}'`);
    
    if (stderr) {
      throw new Error(`AppleScript error: ${stderr}`);
    }
    
    return stdout.trim();
  } catch (error) {
    console.error("AppleScript execution failed:", error);
    throw new Error(`Failed to execute AppleScript: ${error}`);
  }
}
```

### 4. Local Storage (src/utils/storage.ts)

```typescript
import { LocalStorage } from "@raycast/api";

const HISTORY_KEY = "denshobato-history";
const MAX_HISTORY_ITEMS = 10;

export async function getHistory(): Promise<string[]> {
  try {
    const historyJson = await LocalStorage.getItem<string>(HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error("Failed to load history:", error);
    return [];
  }
}

export async function saveToHistory(text: string): Promise<void> {
  try {
    const currentHistory = await getHistory();
    
    // Remove duplicates
    const filteredHistory = currentHistory.filter(item => item !== text);
    
    // Add new item to beginning
    const newHistory = [text, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
    
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error("Failed to save history:", error);
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await LocalStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error("Failed to clear history:", error);
  }
}
```

### 5. Type Definitions (src/types/index.ts)

```typescript
export interface HistoryItem {
  id: string;
  text: string;
  createdAt: Date;
}

export interface ClipboardContent {
  text?: string;
  file?: string;
}

export interface AppPreferences {
  preserveHistory: boolean;
  maxHistoryItems: number;
  showCharacterCount: boolean;
}
```

---

## 📦 Package.json Configuration

```json
{
  "name": "denshobato",
  "title": "Denshobato",
  "description": "Send multi-line IME text to terminal applications bypassing input issues",
  "icon": "icon.png",
  "author": "your-name",
  "contributors": ["your-name"],
  "categories": ["Developer Tools", "Productivity"],
  "license": "MIT",
  "keywords": ["ime", "japanese", "chinese", "korean", "terminal", "input", "productivity", "zed", "claude"],
  "version": "1.0.0",
  "commands": [
    {
      "name": "index",
      "title": "Send IME Text",
      "subtitle": "Multi-line IME Input",
      "description": "Send multi-line IME text to active terminal application",
      "mode": "view",
      "keywords": ["ime", "japanese", "terminal", "send", "input"]
    }
  ],
  "preferences": [
    {
      "name": "preserveHistory",
      "type": "checkbox",
      "required": false,
      "title": "Preserve Input History",
      "description": "Keep history of previous inputs for quick reuse",
      "default": true
    },
    {
      "name": "maxHistoryItems",
      "type": "textfield",
      "required": false,
      "title": "Max History Items",
      "description": "Maximum number of history items to keep (1-20)",
      "default": "10"
    },
    {
      "name": "showCharacterCount",
      "type": "checkbox",
      "required": false,
      "title": "Show Character Count",
      "description": "Display real-time character and line count",
      "default": true
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.83.1",
    "@raycast/utils": "^1.17.0"
  },
  "devDependencies": {
    "@types/node": "~20.8.0",
    "@types/react": "^18.0.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "build": "ray build -e dist",
    "dev": "ray develop",
    "lint": "ray lint",
    "fix": "ray lint --fix",
    "publish": "ray publish"
  }
}
```

---

## 🎨 Icon Design

### Requirements
- **Size**: 512x512px PNG format
- **Theme**: Light & dark theme compatible
- **Design**: Carrier pigeon motif for IME icon

### Design Concept
```
🕊️ + 💬 = IME Carrier Pigeon
- Main motif: Carrier pigeon silhouette
- Accent: Speech bubble or characters "あ"/"A"
- Color: Blue family (harmonizes with Raycast)
- Style: Minimal, modern
```

---

## 📝 README.md (For Store)

```markdown
# Denshobato (伝書鳩)

Send multi-line IME text (Japanese, Chinese, Korean, etc.) directly to terminal applications, bypassing common input method issues.

![Denshobato Demo](assets/demo.gif)

## 🚀 Features

- ✅ **Multi-line IME text input** - Rich text area supporting all IME languages
- ✅ **Reliable clipboard-based transfer** - Bypass terminal IME issues completely  
- ✅ **Input history** - Quick access to your last 10 inputs
- ✅ **Real-time character count** - Track text length and line count
- ✅ **Universal compatibility** - Works with any terminal (Zed, iTerm2, Terminal.app, etc.)
- ✅ **Privacy-focused** - Automatic clipboard restoration

## 🐛 Problem Solved

Many terminal applications and code editors have issues with IME (Input Method Editor) input, especially:
- Zed Editor integrated terminal
- Claude Code CLI tool
- Various terminal emulators
- Code editors with terminal integration

Characters often appear as garbled text, only show when confirmed, or don't appear at all.

## 🕊️ Solution: The "Denshobato" Way

Like a faithful carrier pigeon (伝書鳩), this extension reliably delivers your message:

1. **Input**: Type your multi-line IME text in Raycast's rich interface
2. **Transfer**: Automatically copies to clipboard and pastes to active terminal
3. **Restore**: Your original clipboard content is automatically restored

## 📋 Usage

1. Open Raycast (`Cmd + Space`)
2. Type "Denshobato" or "Send IME Text"
3. Enter your multi-line text (Japanese, Chinese, Korean, etc.)
4. Press `Cmd + Enter` to send to terminal
5. Your text appears perfectly in the active terminal!

## ⌨️ Keyboard Shortcuts

- `Cmd + Enter`: Send text to terminal
- `Cmd + K`: Clear input field
- Navigate history via Action Panel

## 🎯 Perfect For

- **Developers** using Zed Editor with Claude Code
- **Terminal users** working with IME languages
- **Anyone** frustrated with terminal IME input issues
- **Multilingual workflows** requiring reliable text input

## 🔐 Privacy

This extension temporarily uses your system clipboard but automatically restores the original content after sending text. No data is stored externally.

## 🛠️ Technical Details

- **Platform**: macOS only (uses AppleScript for reliable text sending)
- **Method**: Clipboard-based transfer with automatic restoration
- **Storage**: Local history only (last 10 inputs)
- **Languages**: Supports all IME languages (Japanese, Chinese, Korean, etc.)

---

*Named after the Japanese concept of "伝書鳩" (denshobato) - carrier pigeons that faithfully deliver messages exactly as intended.*
```

---

## 🚢 Store Publication Process

### 1. Development & Testing Phase
```bash
# Create project
ray create denshobato

# Start development
cd denshobato
npm install
npm run dev

# Testing
# Test Japanese input in Zed terminal
# Verify operation in various terminal applications
```

### 2. Quality Check
```bash
# Lint & build check
npm run lint
npm run build

# Test cases
# - Japanese (hiragana, katakana, kanji)
# - Chinese (simplified, traditional)
# - Korean (hangul)
# - Emoji & special characters
# - Very long text
# - Whitespace & newlines only
```

### 3. Asset Preparation
- **Icon creation** (512x512px)
- **Screenshots** (for store)
- **Demo GIF** (usage demonstration)

### 4. Documentation Preparation
- **README.md** (see above)
- **CHANGELOG.md** initial version
- **License** MIT License

### 5. GitHub Publication
```bash
# Create GitHub repository
git init
git add .
git commit -m "Initial commit: Denshobato v1.0.0"
git remote add origin https://github.com/your-username/denshobato.git
git push -u origin main
```

### 6. Raycast Store Submission
1. **Fork** [raycast/extensions](https://github.com/raycast/extensions)
2. **Add extension** to extensions directory
3. **Update** extensions.toml
4. **Create Pull Request**
5. **Review process** (typically 1-2 weeks)

### 7. Marketing Preparation
- **Twitter/X** post preparation
- **Dev.to article** development experience
- **Personal blog** technical explanation
- **Raycast Community** Discord participation & announcement

---

## 🔄 Development Roadmap

### Phase 1: MVP (v1.0.0)
- [x] Basic multi-line input
- [x] Clipboard-based sending
- [x] Input history functionality
- [x] Error handling

### Phase 2: Enhancement (v1.1.0)
- [ ] Preferences configuration support
- [ ] Pre-send preview
- [ ] Shortcut customization
- [ ] Statistics (usage count, etc.)

### Phase 3: Advanced (v1.2.0)
- [ ] Template functionality
- [ ] Tagging & categories
- [ ] Export & import
- [ ] Integration with other apps

### Phase 4: Enterprise (v2.0.0)
- [ ] Team sharing functionality
- [ ] Cloud synchronization
- [ ] Advanced statistics & analytics
- [ ] API provision

---

## 🤝 Development Structure

### Required Skills
- **TypeScript/React** - UI development
- **Raycast API** - Platform understanding
- **macOS/AppleScript** - System integration
- **UX/UI Design** - Usability

### Development Timeline Estimate
- **MVP Development**: 1-2 weeks
- **Testing & Adjustment**: 1 week  
- **Store Application & Approval**: 2-3 weeks
- **Total Duration**: 1-1.5 months

### Success Metrics
- **Install Count**: 100 in first month
- **Review Rating**: 4.5+ stars
- **GitHub Stars**: 50 stars
- **Community Response**: Social media mentions

---

## 📞 Support & Feedback

When stuck during development:
- **Raycast Discord** #extensions channel
- **GitHub Issues** Bug reports & feature requests
- **Twitter/X** @your_handle for progress sharing

This is an excellent project that will provide new value to the Japanese developer community! 🕊️✨