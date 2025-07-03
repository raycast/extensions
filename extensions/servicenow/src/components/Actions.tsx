import { Action, ActionPanel, Icon, Keyboard, List, LocalStorage } from "@raycast/api";

import useInstances from "../hooks/useInstances";
import Instances from "./InstancesList";

export default function Actions({ cantRefresh, revalidate }: { cantRefresh?: boolean; revalidate: () => void }) {
  const { instances, selectedInstance, setSelectedInstance } = useInstances();

  return (
    <>
      {!cantRefresh && (
        <List.Dropdown.Section title="List">
          <Action
            icon={Icon.ArrowClockwise}
            title="Refresh"
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </List.Dropdown.Section>
      )}
      <List.Dropdown.Section title="Instance Profiles">
        <Action.Push
          icon={Icon.Gear}
          title="Manage Instance Profiles"
          target={<Instances />}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        />
        <ActionPanel.Submenu
          title={"Select Instance Profile"}
          icon={Icon.Check}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
        >
          {instances?.map((instance) => (
            <Action
              key={instance.id}
              icon={{
                source: selectedInstance?.id == instance.id ? Icon.CheckCircle : Icon.Circle,
                tintColor: instance.color,
              }}
              title={instance.alias ? instance.alias : instance.name}
              onAction={() => {
                setSelectedInstance(instance);
                LocalStorage.setItem("selected-instance", JSON.stringify(instance));
              }}
            />
          ))}
        </ActionPanel.Submenu>
      </List.Dropdown.Section>
    </>
  );
}
