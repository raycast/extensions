import { ActionPanel, Icon, List, Action } from "@raycast/api";

const HOOKS: { [section: string]: { [title: string]: string } } = {
  ENHANCEMENT: {
    useKeyboard: "use-keyboard",
    useInput: "use-input",
    useModal: "use-modal",
    useTabs: "use-tabs",
    useToast: "use-toast",
  },
  UTILITIES: {
    useBodyScroll: "use-body-scroll",
    useClickAway: "use-click-away",
    useClipboard: "use-clipboard",
    useMediaQuery: "use-media-query",
  },
  DEVELOPMENT: {
    useTheme: "use-theme",
    useCurrentState: "use-current-state",
    useScale: "use-scale",
    useClass: "use-class",
  },
};

export default function Command() {
  return (
    <List searchBarPlaceholder="Search for hooks">
      {Object.entries(HOOKS).map(([section, hook]) => (
        <List.Section key={section} title={section}>
          {Object.entries(hook).map(([title, route]) => (
            <List.Item
              key={title}
              icon={Icon.Link}
              title={title}
              keywords={[section]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`https://geist-ui.dev/en-us/hooks/${route}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
