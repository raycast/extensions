import { Action, ActionPanel, Icon, List, LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import useInstances, { Instance } from "../hooks/useInstances";
import Instances from "./InstancesList";

export default function Actions({ mutate }: { mutate: () => void }) {
  const { instances } = useInstances();
  const [selectedInstance, setSelectedInstance] = useCachedState<Instance>("instance");

  return (
    <>
      <List.Dropdown.Section title="History">
        <Action
          icon={Icon.ArrowClockwise}
          title="Refresh"
          onAction={mutate}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      </List.Dropdown.Section>
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
                LocalStorage.setItem("selected-instance", instance.name);
              }}
            />
          ))}
        </ActionPanel.Submenu>
      </List.Dropdown.Section>
    </>
  );
}
