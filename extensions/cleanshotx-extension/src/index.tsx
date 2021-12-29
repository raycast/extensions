import { ActionPanel, CopyToClipboardAction, OpenInBrowserAction, List } from "@raycast/api";

export default function Command() {

  const items = [
    {
      key: "Capture Fullscreen",
      title: "Capture Fullscreen",
      subtitle: "Fullscreen screenshot",
      urlScheme: "cleanshot://capture-fullscreen",
    },
    {
      key: "Capture Area",
      title: "Capture Area",
      subtitle: "Selection tool capture",
      urlScheme: "cleanshot://capture-area",
    },
    {
      key: "Capture Previous Area",
      title: "Capture Previous Area",
      subtitle: "Previously selected area",
      urlScheme: "cleanshot://capture-previous-area",
    },
    {
      key: "Capture Window",
      title: "Capture Window",
      subtitle: "Window capture",
      urlScheme: "cleanshot://capture-window",
    },
    {
      key: "Self Timer",
      title: "Self Timer",
      subtitle: "Timer based screen capture",
      urlScheme: "cleanshot://self-timer",
 },
    {
      key: "Scrolling Capture",
      title: "Scrolling Capture",
      subtitle: "scrolling capture mode",
      urlScheme: "cleanshot://scrolling-capture",
    },
    {
      key: "Record Screen",
      title: "Record Screen",
      subtitle: "Record entire screen",
      urlScheme: "cleanshot://record-screen",
    },
    {
      key: "Text Recognition",
      title: "Text Recognition",
      subtitle: "Text recognition using OCR",
      urlScheme: "cleanshot://capture-text",
    },
    {
      key: "Annotate",
      title: "Annotate",
      subtitle: "Annotate mode",
      urlScheme: "cleanshot://open-annotate",
    },
    {
      key: "Open from clipboard",
      title: "Open from clipboard",
      subtitle: "Open image from clipboard",
      urlScheme: "cleanshot://open-from-clipboard",
    },
    {
      key: "Toggle Desktop icons",
      title: "Toggle Desktop icons",
      subtitle: "Toggle desktop icons visibility",
      urlScheme: "cleanshot://toggle-desktop-icons",
    },

    {
      key: "Restore recently closed",
      title: "Restore recently closed",
      subtitle: "Restore recently closed overlay",
      urlScheme: "cleanshot://restore-recently-closed",
    }
  ]

  return (
    <List isLoading={false} searchBarPlaceholder="Filter by title...">
      {items.map((item) => (
        <List.Item
          key={item.key}
          icon="list-icon.png"
          title={item.key}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              <OpenInBrowserAction title="Run Action" url={item.urlScheme} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
