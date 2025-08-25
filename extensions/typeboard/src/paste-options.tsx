import { Action, ActionPanel, List, showToast, Toast, Clipboard, closeMainWindow } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface PasteOption {
  title: string;
  subtitle: string;
  action: () => Promise<void>;
}

export default function Command() {
  const pasteOptions: PasteOption[] = [
    {
      title: "Normal Paste",
      subtitle: "Trigger default paste function",
      action: normalPaste,
    },
    {
      title: "Character by Character",
      subtitle: "write each character by char. (for special chars <3 my bro test)",
      action: characterByCharacterPaste,
    },
    {
      title: "Word by Word",
      subtitle: "paste word by word",
      action: wordByWordPaste,
    },
    {
      title: "Line by Line",
      subtitle: "paste line by line",
      action: lineByLinePaste,
    },
  ];

  return (
    <List>
      {pasteOptions.map((option, index) => (
        <List.Item
          key={index}
          title={option.title}
          subtitle={option.subtitle}
          actions={
            <ActionPanel>
              <Action title="Execute" onAction={option.action} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Normal paste işlemi
async function normalPaste() {
  try {
    const clipboardText = await Clipboard.readText();
    if (!clipboardText) {
      showToast(Toast.Style.Failure, "Empty Clipboard!");
      return;
    }

    // Raycast penceresini kapat ve kısa bekle
    await closeMainWindow();
    await new Promise((resolve) => setTimeout(resolve, 200));

    // AppleScript kullanarak paste simülasyonu
    const script = `
      tell application "System Events"
        keystroke "v" using command down
      end tell
    `;

    await execAsync(`osascript -e '${script}'`);
    showToast(Toast.Style.Success, "Pasted!");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    showToast(Toast.Style.Failure, "Something went wrong!");
  }
}

// Karakter karakter yazma
async function characterByCharacterPaste() {
  try {
    const clipboardText = await Clipboard.readText();
    if (!clipboardText) {
      showToast(Toast.Style.Failure, "Empty Clipboard!");
      return;
    }

    // Raycast penceresini kapat ve kısa bekle
    await closeMainWindow();
    await new Promise((resolve) => setTimeout(resolve, 200));

    showToast(Toast.Style.Animated, "writing...");

    for (const char of clipboardText) {
      if (char === "\n") {
        await execAsync(`osascript -e 'tell application "System Events" to key code 36'`);
      } else if (char === "\t") {
        await execAsync(`osascript -e 'tell application "System Events" to key code 48'`);
      } else {
        // Özel karakterleri escape et
        const escapedChar = char.replace(/'/g, "\\'").replace(/"/g, '\\"');
        await execAsync(`osascript -e 'tell application "System Events" to keystroke "${escapedChar}"'`);
      }

      // Kısa bekleme (çok hızlı olmasın diye)
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    showToast(Toast.Style.Success, "Done!");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    showToast(Toast.Style.Failure, "something went wrong!");
  }
}

// Kelime kelime yapıştırma
async function wordByWordPaste() {
  try {
    const clipboardText = await Clipboard.readText();
    if (!clipboardText) {
      showToast(Toast.Style.Failure, "empty Clipboard!");
      return;
    }

    // Raycast penceresini kapat ve kısa bekle
    await closeMainWindow();
    await new Promise((resolve) => setTimeout(resolve, 200));

    showToast(Toast.Style.Animated, "writing by words by words...");

    const words = clipboardText.split(" ");

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const escapedWord = word.replace(/'/g, "\\'").replace(/"/g, '\\"');

      await execAsync(`osascript -e 'tell application "System Events" to keystroke "${escapedWord}"'`);

      // Son kelime değilse space ekle
      if (i < words.length - 1) {
        await execAsync(`osascript -e 'tell application "System Events" to keystroke " "'`);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    showToast(Toast.Style.Success, "done!");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    showToast(Toast.Style.Failure, "something went wrong!");
  }
}

// Satır satır yapıştırma
async function lineByLinePaste() {
  try {
    const clipboardText = await Clipboard.readText();
    if (!clipboardText) {
      showToast(Toast.Style.Failure, "empty Clipboard!");
      return;
    }

    // Raycast penceresini kapat ve kısa bekle
    await closeMainWindow();
    await new Promise((resolve) => setTimeout(resolve, 200));

    showToast(Toast.Style.Animated, "writing line by line...");

    const lines = clipboardText.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const escapedLine = line.replace(/'/g, "\\'").replace(/"/g, '\\"');

      await execAsync(`osascript -e 'tell application "System Events" to keystroke "${escapedLine}"'`);

      // Son satır değilse enter ekle
      if (i < lines.length - 1) {
        await execAsync(`osascript -e 'tell application "System Events" to key code 36'`);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    showToast(Toast.Style.Success, "done!");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    showToast(Toast.Style.Failure, "something went wrong!");
  }
}
