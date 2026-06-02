import { Action, Icon, showToast, Toast, Keyboard, Color } from "@raycast/api";

interface CycleBrowserActionProps {
  availableBrowsers: string[];
  browserFilter: string;
  setBrowserFilter: (value: string) => void;
  windowsByBrowser: Record<string, { id: string; name: string }[]>;
  windowFilters: Record<string, string>;
  includeAllWindows: boolean;
  setWindowFilterForBrowser: (browser: string, windowId: string) => void;
  shortcut?: Keyboard.Shortcut;
}

export function CycleBrowserAction({
  availableBrowsers,
  browserFilter,
  setBrowserFilter,
  windowsByBrowser,
  windowFilters,
  includeAllWindows,
  setWindowFilterForBrowser,
  shortcut,
}: CycleBrowserActionProps) {
  if (availableBrowsers.length <= 1) return null;

  return (
    <Action
      title="Cycle Browser Filter"
      icon={{ source: Icon.Switch, tintColor: Color.Magenta }}
      shortcut={shortcut || { modifiers: [], key: "`" }}
      onAction={() => {
        const choices = includeAllWindows ? ["all", ...availableBrowsers] : [...availableBrowsers];
        const currentIndex = choices.indexOf(browserFilter);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % choices.length;
        const nextValue = choices[nextIndex];

        setBrowserFilter(nextValue);

        // Proactive Window Resolution
        if (nextValue !== "all") {
          const windows = windowsByBrowser[nextValue] || [];
          if (windows.length > 0) {
            const savedWindow = windowFilters[nextValue];
            const isValid = savedWindow === "all" ? includeAllWindows : windows.some((w) => w.id === savedWindow);
            if (!isValid) {
              const bestWindow = includeAllWindows ? "all" : windows[0].id;
              setWindowFilterForBrowser(nextValue, bestWindow);
            }
          }
        }

        // Visual feedback
        const browserName =
          nextValue === "all" ? "All Browsers" : nextValue.charAt(0).toUpperCase() + nextValue.slice(1);
        showToast(Toast.Style.Success, `Switched to ${browserName}`);
      }}
    />
  );
}
