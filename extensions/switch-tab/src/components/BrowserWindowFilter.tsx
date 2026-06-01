import { List, Icon } from "@raycast/api";

type MinimalBrowserWindow = { id: string | number; name: string };

interface SearchBarFilterProps {
  availableBrowsers: string[];
  browserFilter: string;
  setBrowserFilter: (browser: string) => void;
  showWindowFilter: boolean;
  windowsByBrowser: Record<string, MinimalBrowserWindow[]>;
  currentWindowFilter: string | number;
  setWindowFilterForBrowser: (browser: string, windowId: string) => void;
  includeAllWindows: boolean;
  BROWSER_ICONS: Record<string, string | Icon>;
}

export function SearchBarFilter({
  availableBrowsers,
  browserFilter,
  setBrowserFilter,
  showWindowFilter,
  windowsByBrowser,
  currentWindowFilter,
  setWindowFilterForBrowser,
  includeAllWindows,
  BROWSER_ICONS,
}: SearchBarFilterProps) {
  if (
    availableBrowsers.length <= 1 &&
    (!showWindowFilter || !availableBrowsers.some((b) => (windowsByBrowser[b] || []).length > 1))
  ) {
    return null; // Return null if not enough browsers/windows to filter
  }

  const dropdownValue = showWindowFilter
    ? `${browserFilter}|${(() => {
        if (currentWindowFilter === "all" && !includeAllWindows) {
          const windows = windowsByBrowser[browserFilter] || [];
          if (windows.length > 0) return windows[0].id;
        }
        return currentWindowFilter;
      })()}`
    : browserFilter;

  return (
    <List.Dropdown
      tooltip="Filter Tabs"
      value={dropdownValue}
      onChange={(newValue) => {
        if (showWindowFilter) {
          const [b, w] = newValue.split("|");
          setBrowserFilter(b);
          setWindowFilterForBrowser(b, w);
        } else {
          setBrowserFilter(newValue);
        }
      }}
    >
      {showWindowFilter ? (
        availableBrowsers.map((b) => {
          const windows = windowsByBrowser[b] || [];
          const hasMultipleWindows = windows.length > 1;

          if (hasMultipleWindows) {
            return (
              <List.Dropdown.Section key={b} title={b.charAt(0).toUpperCase() + b.slice(1)}>
                {includeAllWindows && (
                  <List.Dropdown.Item key={`${b}-all`} title="All Windows" value={`${b}|all`} icon={BROWSER_ICONS[b]} />
                )}
                {windows.map((w) => (
                  <List.Dropdown.Item key={w.id} title={w.name} value={`${b}|${w.id}`} icon={BROWSER_ICONS[b]} />
                ))}
              </List.Dropdown.Section>
            );
          } else {
            const winId = windows[0]?.id || "all";
            if (includeAllWindows) {
              // Show a section with "All Windows" + the single window
              return (
                <List.Dropdown.Section key={b} title={b.charAt(0).toUpperCase() + b.slice(1)}>
                  <List.Dropdown.Item key={`${b}-all`} title="All Windows" value={`${b}|all`} icon={BROWSER_ICONS[b]} />
                  <List.Dropdown.Item
                    key={`${b}-${winId}`}
                    title={windows[0]?.name || "Window 1"}
                    value={`${b}|${winId}`}
                    icon={BROWSER_ICONS[b]}
                  />
                </List.Dropdown.Section>
              );
            }
            return (
              <List.Dropdown.Item
                key={b}
                title={b.charAt(0).toUpperCase() + b.slice(1)}
                value={`${b}|${winId}`}
                icon={BROWSER_ICONS[b]}
              />
            );
          }
        })
      ) : (
        <>
          <List.Dropdown.Item title="All Browsers" value="all" icon={BROWSER_ICONS.all} />
          {availableBrowsers.map((b) => (
            <List.Dropdown.Item
              key={b}
              title={b.charAt(0).toUpperCase() + b.slice(1)}
              value={b}
              icon={BROWSER_ICONS[b] || Icon.Globe}
            />
          ))}
        </>
      )}
    </List.Dropdown>
  );
}
