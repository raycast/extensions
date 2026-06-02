import {
  Action,
  ActionPanel,
  Form,
  useNavigation,
  Icon,
  Color,
} from "@raycast/api";
import { useMemo } from "react";
import { DisplayTab } from "../types";
import { BROWSER_COLORS, getTabGroupColor } from "../helpers";

interface CreateGroupFormProps {
  tab: DisplayTab;
  allTabs: DisplayTab[];
  onCreate: (
    tab: DisplayTab,
    groupName: string,
    color: string,
    tabIds?: string[],
  ) => void;
}

export function CreateGroupForm({
  tab,
  allTabs,
  onCreate,
}: CreateGroupFormProps) {
  const { pop } = useNavigation();
  const browserType = tab.browserType || "edge";

  // dynamic keys based on browser
  const availableColors = BROWSER_COLORS[browserType] || BROWSER_COLORS.chrome;
  const colorNames = Object.keys(availableColors);

  // Extract domain/hostname for the toggle label
  const hostname = useMemo(() => {
    try {
      if (!tab.url) return "";
      return new URL(tab.url).hostname.replace("www.", "");
    } catch {
      return "";
    }
  }, [tab.url]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Group"
            icon={{ source: Icon.Plus, tintColor: Color.Orange }}
            onSubmit={(values) => {
              let finalColor = values.color;
              if (browserType === "edge") {
                if (values.color === "navy") finalColor = "green";
                if (values.color === "magenta") finalColor = "red";
              }

              let tabIds: string[] | undefined = undefined;
              if (values.groupDomain && hostname) {
                // Group all tabs from the same domain in the SAME browser and window
                tabIds = allTabs
                  .filter((t) => {
                    try {
                      if (!t.url) return false;
                      const tHost = new URL(t.url).hostname.replace("www.", "");
                      return (
                        tHost === hostname &&
                        t.browserType === tab.browserType &&
                        t.windowId === tab.windowId
                      );
                    } catch {
                      return false;
                    }
                  })
                  .map((t) => String(t.id));
              }

              onCreate(tab, values.groupName, finalColor, tabIds);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Create a new group for tab: ${tab.title} (${browserType})`}
      />
      <Form.TextField
        id="groupName"
        title="Group Name"
        placeholder="My Awesome Group"
      />
      <Form.Dropdown id="color" title="Color" defaultValue="grey">
        {colorNames.map((name) => {
          let title = name.charAt(0).toUpperCase() + name.slice(1);

          if (browserType !== "edge" && name === "grey") {
            title = "White";
          }

          return (
            <Form.Dropdown.Item
              key={name}
              value={name}
              title={title}
              icon={{
                source: Icon.Circle,
                tintColor: getTabGroupColor(name, browserType),
              }}
            />
          );
        })}
      </Form.Dropdown>
      {hostname && (
        <Form.Checkbox
          id="groupDomain"
          label={`Group all tabs from ${hostname}`}
          defaultValue={false}
        />
      )}
    </Form>
  );
}
