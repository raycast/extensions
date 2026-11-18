# Clipboard Type

**Clipboard Type** "pastes" the contents of your clipboard by simulating keystrokes. This is useful where standard pasting is blocked, disabled, or unavailable, such as:

- **Restricted Web Forms**: Websites that disable pasting into password or input fields.
- **Remote Desktop (RDP) & VNC**: Remote sessions where clipboard sync is inactive or broken.
- **Legacy Applications**: Older applications that don't support the standard paste command.

## Setup

Clipboard Type simulates keystrokes, so macOS requires permission for Raycast to control your Mac. This setting is called **Device Control and Data Access** in macOS 27 and later, and **Accessibility** in earlier versions. If it's missing, Clipboard Type shows an error with a button that opens the right pane under **System Settings → Privacy & Security**, where you can enable Raycast.

Characters that aren't on a US keyboard, such as `é` or emoji, are typed through System Events. The first time this happens, macOS asks whether Raycast may control System Events. If you denied it, enable it under **Privacy & Security → Automation**.

## Usage

Run **Type Clipboard**. Raycast closes, and the latest text on your clipboard is typed into the focused field. A toast shows how many characters remain. The clipboard contents are never shown in the toast.

To stop typing early, do any of the following:

- Press **Esc**.
- Click **Stop** on the progress toast.
- Switch to another app. Typing stops automatically so keystrokes don't land in the wrong window.

## Preferences

- **Typing Speed** (default Average): How fast to type, from Very Slow (~300 ms per key) to Super Human (~5 ms per key). Capitals and symbols take longer. Every speed except Super Human pauses briefly between keystrokes. Average and slower hold each key for 50 ms, which browser-based remote consoles need to register keys reliably. If characters are dropped or capitals come out lowercase, choose a slower speed.
- **Human Cadence** (default on): Randomly varies the pause between keystrokes to mimic human typing. The average speed stays the same, so turning this off only makes the rhythm even.
- **Soft Newlines (Shift+Enter)**: Types newlines as Shift+Enter instead of Enter. Useful in apps and websites that treat Enter as submit.

Newlines and tabs are typed as Return and Tab keys. Windows-style line endings (`\r\n`) are typed as a single newline.

## Keyboard Layout

Letters, digits, and common symbols are typed as physical key presses based on the US keyboard layout, which improves compatibility with browser-based remote consoles. For reliable results, use the macOS **ABC** or **U.S.** input source while typing. Other layouts and third-party input methods can remap characters such as `z` or `$`.
