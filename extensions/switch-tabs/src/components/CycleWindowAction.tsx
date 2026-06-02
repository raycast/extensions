import { Action, Icon, showToast, Toast, Keyboard, Color } from "@raycast/api";

interface CycleWindowActionProps {
  browserFilter: string;
  windowsByBrowser: Record<string, { id: string; name: string }[]>;
  currentWindowFilter: string;
  includeAllWindows: boolean;
  setWindowFilterForBrowser: (browser: string, windowId: string) => void;
  shortcut?: Keyboard.Shortcut;
}

export function CycleWindowAction({
  browserFilter,
  windowsByBrowser,
  currentWindowFilter,
  includeAllWindows,
  setWindowFilterForBrowser,
  shortcut,
}: CycleWindowActionProps) {
  const windows = windowsByBrowser[browserFilter] || [];

  if (browserFilter === "all" || windows.length <= 1) return null;

  return (
    <Action
      title="Cycle Window Filter"
      icon={{ source: Icon.Switch, tintColor: Color.Magenta }}
      shortcut={shortcut || { modifiers: [], key: "tab" }}
      onAction={() => {
        const choices = includeAllWindows
          ? ["all", ...windows.map((w) => w.id)]
          : windows.map((w) => w.id);
        const currentIndex = choices.indexOf(currentWindowFilter);
        const nextIndex =
          currentIndex === -1 ? 0 : (currentIndex + 1) % choices.length;
        const nextValue = choices[nextIndex];
        const nextName =
          nextValue === "all"
            ? "All Windows"
            : windows.find((w) => w.id === nextValue)?.name || "Window";

        setWindowFilterForBrowser(browserFilter, nextValue);

        showToast(Toast.Style.Success, `Switched to ${nextName}`);
      }}
    />
  );
}
