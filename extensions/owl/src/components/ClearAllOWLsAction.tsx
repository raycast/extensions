import { Action, Alert, confirmAlert, Icon } from "@raycast/api";
import { useCachedStorage } from "../hooks/storage";
import { OWLMapping } from "../types/owl";
import { StorageKey } from "../types/storage";

export function ClearAllOWLsAction() {
  const [, setOWLs] = useCachedStorage<OWLMapping>(StorageKey.OWLS, {});

  return (
    <Action
      title={"Clear Owls"}
      style={Action.Style.Destructive}
      icon={Icon.Trash}
      shortcut={{
        modifiers: ["ctrl", "shift"],
        key: "x",
      }}
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Are you sure?",
            message: `Are you sure you want to clear all owls?`,
            primaryAction: {
              title: "Clear",
              style: Alert.ActionStyle.Destructive,
            },
          })
        ) {
          setOWLs({});
        }
      }}
    />
  );
}
