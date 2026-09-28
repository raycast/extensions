import { Detail, ActionPanel, Action, Icon, openExtensionPreferences, useNavigation, environment } from "@raycast/api";
import { useMemo } from "react";
import fs from "fs";
import path from "path";
import { FeedbackForm } from "./FeedbackForm";

function getScreenshotUri(filename: string): string {
  try {
    const assetsDir = environment.assetsPath;
    const fullPath = path.join(assetsDir, "screenshots", filename);
    if (fs.existsSync(fullPath)) {
      const b64 = fs.readFileSync(fullPath).toString("base64");
      return `data:image/png;base64,${b64}`;
    }
  } catch {
    // fallback to relative path if fs fails
  }
  return `assets/screenshots/${filename}`;
}

interface UserManualViewProps {
  onDismissFirstRun?: () => void;
  isFirstRun?: boolean;
}

export function UserManualView({ onDismissFirstRun, isFirstRun = false }: UserManualViewProps) {
  const { pop } = useNavigation();

  function handleBack() {
    if (isFirstRun && onDismissFirstRun) {
      onDismissFirstRun();
    } else {
      pop();
    }
  }

  const markdown = useMemo(() => {
    const img1 = getScreenshotUri("01_root_search.png");
    const img2 = getScreenshotUri("02_query_routing.png");
    const img3 = getScreenshotUri("03_profile_filter.png");
    const img4 = getScreenshotUri("04_action_panel.png");
    const img5 = getScreenshotUri("05_rename_profile.png");
    const img6 = getScreenshotUri("06_custom_profile.png");

    return `# 🧭 Browser Router — Complete User Manual & Guide

Welcome to **Browser Router**! Browser Router gives you instant, keyboard-driven control over routing web searches and URLs to any browser and profile installed on Windows.

---

## ⚡ 1. Root Search & Fallback Command

You can use Browser Router directly from Raycast's home search bar! Whenever you type a search query or URL, Browser Router appears as an instant fallback command.

![Raycast Root Search & Fallback](${img1})

* Type your search query or web URL on Raycast's home screen.
* Press **\`Enter\`** on **Browser Router** to route it immediately to your favorite browser profile.

---

## 🚀 2. Instant Query & Argument Routing

Browser Router supports direct argument execution, letting you pass queries seamlessly from shortcuts or quick links:

![Query & Argument Routing](${img2})

* Type your search query (e.g. \`Modern Web Design\`) or a direct URL (\`github.com\`, \`localhost:3000\`).
* All browser profiles stay visible so you never lose sight of your destinations while typing.

---

## 🎯 3. Profile Filter Mode (\`Tab\`)

Need to find a specific browser or profile among many? Toggle into **Profile Filter Mode** with a single keystroke:

![Profile Filter Mode](${img3})

* Press **\`Tab\`** to toggle between **Search Query Mode** and **Profile Filter Mode**.
* Your typed search query is **safely preserved in memory**!
* Type to filter profiles in real-time by:
  * **Browser name** (\`chrome\`, \`edge\`, \`brave\`, \`vivaldi\`, \`firefox\`)
  * **Profile name** (\`Personal\`, \`Coding\`, \`College\`, \`Business\`)
  * **Directory name** (\`Default\`, \`Profile 1\`, \`Profile 2\`)
* Press **\`Tab\`** again to return to Search Query Mode.

---

## ⚡ 4. Action Panel & Power Shortcuts (\`Ctrl + K\`)

Press **\`Ctrl + K\`** on any profile to reveal quick actions and shortcuts:

![Action Panel & Shortcuts](${img4})

* **\`Enter\`**: Open query or URL in the selected profile.
* **\`Ctrl + Enter\`**: Open in **Incognito / InPrivate** mode.
* **\`Tab\`**: Switch to Profile Filter Mode.
* **\`Ctrl + F\`**: Pin / unpin to **Favorites** at the very top.
* **\`Ctrl + E\`**: Rename profile display nickname.
* **\`Ctrl + N\`**: Add a custom or portable browser.
* **\`Ctrl + H\`**: Open this User Manual anytime.
* **\`Ctrl + Shift + F\`**: Open the Feedback & Bug Report box.

---

## ✏️ 5. Custom Profile Nicknames (\`Ctrl + E\`)

Personalize your browser profiles with friendly, easy-to-read names:

![Rename Profile Display Name](${img5})

* Highlight any profile and press **\`Ctrl + E\`** (or choose *Rename Display Name* from actions).
* Type a custom nickname (e.g. *"Chrome — Personal"*, *"Chrome — Coding"*).
* Clear the input and save to revert to the default detected name anytime.

---

## ➕ 6. Add Custom & Portable Browsers (\`Ctrl + N\`)

If you use portable browsers, developer builds (Canary, Developer Edition), or non-standard install paths, register them effortlessly:

![Add Custom / Portable Browser](${img6})

* Press **\`Ctrl + N\`** (or choose *Add Custom Profile* from the Action Panel).
* Enter the browser name, profile display name, and executable path (\`.exe\`).
* Custom profiles can be removed anytime with **\`Ctrl + Backspace\`**.

---

## 🌐 URL & Destination Routing Cheat-Sheet

Browser Router automatically detects and parses whatever you type:

| Input Type | Example | How Browser Router Handles It |
| :--- | :--- | :--- |
| **Search Query** | \`modern web design\` | Encodes query and routes to your configured search engine |
| **Standard URL** | \`https://news.ycombinator.com\` | Opens destination directly without searching |
| **Bare Domain** | \`github.com/trending\` | Automatically prepends \`https://\` and opens |
| **Localhost & Ports** | \`localhost:3000\`, \`127.0.0.1:8080\` | Automatically prepends \`http://\` and opens local dev servers |
| **Windows File Path** | \`C:\\\\Users\\\\Username\\\\Documents\\\\page.html\` | Automatically converts to \`file:///\` URI and opens local document |
| **Internal Browser Pages** | \`chrome://extensions\`, \`edge://settings\` | Handled cleanly; falls back to a clean tab if restricted externally |

---

## ⌨️ Complete Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| **\`Enter\`** | **Open in Profile** | Opens query or URL in the selected browser profile |
| **\`Ctrl + Enter\`** | **Open Incognito** | Launches selected profile in Incognito (Chrome/Brave) or InPrivate (Edge) |
| **\`Tab\`** | **Toggle Search / Filter** | Switches between Search Query Mode and Profile Filter Mode |
| **\`Ctrl + F\`** | **Toggle Favorite** | Pins or unpins the profile to the top "Favorites" section |
| **\`Ctrl + E\`** | **Rename Profile** | Sets a custom friendly nickname (e.g. *"Chrome — Coding"*) |
| **\`Ctrl + N\`** | **Add Custom Profile** | Registers a portable browser or custom profile path |
| **\`Ctrl + H\`** | **User Manual** | Opens this comprehensive guide and shortcuts reference |
| **\`Ctrl + Shift + F\`** | **Send Feedback** | Opens the built-in Bug Report & Feature Request box |
| **\`Ctrl + Shift + X\`** | **Clear Query** | Quickly resets the active search query |
| **\`Ctrl + C\`** | **Copy Target URL** | Copies the generated search or destination URL to clipboard |
| **\`Ctrl + R\`** | **Refresh Profiles** | Re-scans Windows system for newly added browser profiles |
| **\`Ctrl + ,\`** | **Preferences** | Opens extension settings (Default Search Engine, Custom URL) |

---

## 🛡️ Authentic Profile Persistence on Windows

Unlike basic URL openers that launch temporary guest sessions, Browser Router features **deep Windows profile detection**:
* Detects genuine user data directories for **Chrome, Microsoft Edge, Brave, Vivaldi, and Chromium**.
* Preserves all logins, cookies, extensions, and bookmarks across sessions.
* Seamlessly coordinates with already running browser windows without duplicate processes.

---

## 💬 Community & Direct Feedback

Found a bug or have an idea for a feature?
* Press **\`Ctrl + Shift + F\`** anywhere in Browser Router.
* Submit a report directly to the development team via our automated relay.
`;
  }, []);

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title={isFirstRun ? "Get Started (Go to Browser Router)" : "Back to Browser Router"}
            icon={isFirstRun ? Icon.Checkmark : Icon.ArrowLeft}
            onAction={handleBack}
          />
          <Action.Push
            title="Send Feedback / Feature Request"
            icon={Icon.Envelope}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "f" }}
            target={<FeedbackForm />}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["ctrl"], key: "," }}
            onAction={openExtensionPreferences}
          />
          <Action.CopyToClipboard
            title="Copy User Manual"
            content={markdown}
            shortcut={{ modifiers: ["ctrl"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
