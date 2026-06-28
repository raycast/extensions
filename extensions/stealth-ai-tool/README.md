# Stealth AI

In-line AI formatting using Raycast AI. Works on both macOS and Windows.

## 🚀 Getting Started

1. **Select Text**: Highlight any text in any app.
2. **Run Action**: Trigger a "Stealth Action" via Raycast search, hotkey, or alias.
3. **Pasted Result**: The AI processes the text and pastes the result directly over your selection.

## Demo:

https://github.com/user-attachments/assets/3072d252-adf8-4272-906c-02434c9817d6

# Installation:

- run this code from your terminal

`git clone https://github.com/ahmed-exov/Raycast--Stealth-AI.git && cd Raycast--Stealth-AI && npm install && npm run dev`

- Open Raycast settings > Extensions > Stealth AI and assign shortcuts and aliases
- Start using in your favorite text editor

## 🖥️ Platform Support

- **macOS**: Full support with improved focus management
- **Windows**: Full support via Raycast Windows public beta

## ⚙️ Configuration & Customization

### 1. AI Model Selection

You can change which AI model is used for these actions globally:

- Open **Raycast Settings** (`Command + ,` on macOS, `Ctrl + ,` on Windows)
- Navigate to the **AI** tab
- Change the **Quick AI Model** selection.

### 2. Hotkeys & Aliases

To make these actions truly "stealth", it is highly recommended to set up custom hotkeys or aliases for your most used actions:

- Open **Raycast Settings** > **Extensions**
- Search for **Stealth AI**
- Set a **Hotkey** (e.g., `Control + F` for Fix Grammar) or an **Alias** (e.g., `fx`) for each command.

### 3. Custom Prompts (Multiline)

If you want to tweak the prompt for an action:

- Run the action **without selecting any text**.
- Or, click the **"Edit Prompt"** button/shortcut (`Cmd + Shift + E`) in the notification that appears while an action is running.
- This opens a multiline editor where you can customize the prompt to your liking.

## 🛠️ Included Actions

- **Stealth Action 1 (Fix Grammar)**: Fixes typos and grammar errors.
- **Stealth Action 2 (Make Concise)**: Shortens text while preserving meaning.
- **Stealth Action 3 (Create List)**: Converts text into a bullet point list.
- **Stealth Action 4 (Make Professional)**: Rewrites text for business communication.
- **Stealth Action 5 (Simplify)**: Makes complex text easier to understand.
- **Actions 6-9**: Fully customizable slots for your own custom AI prompts.
