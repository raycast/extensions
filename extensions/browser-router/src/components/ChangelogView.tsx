import { Detail, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";

interface ChangelogViewProps {
  onDismiss?: () => void;
}

export function ChangelogView({ onDismiss }: ChangelogViewProps = {}) {
  const { pop } = useNavigation();

  const markdown = `# 🚀 Browser Router Changelog & What's New

## [v1.1] - Latest Update

### 🌟 New Features
* **Universal Browser Engine Support**: Seamless execution alias discovery and native credential preservation across all modern Windows browsers.
* **Smart Profile Sorting**: Choose between 4 sorting modes with **\`Ctrl + S\`**:
  * **Alphabetical (A → Z)**: Standard dictionary order.
  * **Reverse Alphabetical (Z → A)**: Descending alphabetical order.
  * **Most Frequently Used (MRU)**: Automatically surfaces your most launched browser profiles at the top.
  * **Custom Order**: User-defined manual positioning.
* **Interactive Reorder Layout (\`Ctrl + Shift + O\`)**:
  * Dedicated screen displaying numerical rank badges (\`#1\`, \`#2\`, \`#3\`).
  * Move profiles up or down with **\`Alt + Up\`** and **\`Alt + Down\`**.
  * Pin any profile directly to #1 with **\`Ctrl + Shift + Up\`**.
* **Visual Status Badges**:
  * Favorite profiles feature a gold Star indicator (⭐).
  * Manually registered custom profiles feature a dedicated **Custom** purple badge.

### 🛡️ Reliability & Security Fixes
* **Safe CLI Argument Quoting**: Fixed double-quote handling so searches with quotes (e.g. \`site:github.com "react"\`) open in a single tab without splitting.
* **Enhanced URL Resolution**: Programming keywords like \`react.js\`, \`node.js\`, and \`vue.js\` are now correctly searched on Google instead of broken into fake web domains.
* **Strict IPv4 Validation**: Bounded IP parsing to valid 0-255 octets.
* **Real-Time Disk Validation**: Added real-time disk checks in the Custom Profile form to prevent saving invalid or mistyped \`.exe\` paths.
* **Zero-Lag Loading**: In-memory caching for Windows registry and MSIX package queries, eliminating 200ms+ synchronous UI blocking.

---

## [Initial Release] - 2026-09-09
* Initial release of Browser Router for Windows.
* Route search queries and URLs directly from Raycast to any installed browser and profile.
* Authentic profile persistence for Google Chrome, Microsoft Edge, Brave, Vivaldi, Arc, and Mozilla Firefox.
* In-place friendly profile renaming and custom display names.
* Custom and portable browser profile registration.
* Privacy-first local architecture with built-in user guide and feedback support.
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Back to Browser Router"
            icon={Icon.ArrowLeft}
            onAction={() => {
              if (onDismiss) onDismiss();
              pop();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
