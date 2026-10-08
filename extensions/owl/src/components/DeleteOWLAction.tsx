import { Action, Alert, confirmAlert, Icon, Keyboard } from "@raycast/api";
import { useCachedStorage } from "../hooks/storage";
import { OWL, OWLMapping } from "../types/owl";
import { StorageKey } from "../types/storage";

export function DeleteOWLAction(props: Readonly<{ owl: OWL }>) {
  const { owl } = props;
  const [, setOWLs] = useCachedStorage<OWLMapping>(StorageKey.OWLS, {});

  return (
    <Action
      title={"Delete Owl"}
      style={Action.Style.Destructive}
      icon={Icon.Trash}
      shortcut={Keyboard.Shortcut.Common.Remove}
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Are you sure?",
            message: `Are you sure you want to delete the owl from ${owl.from} to ${owl.to}?`,
            primaryAction: {
              title: "Delete",
              style: Alert.ActionStyle.Destructive,
            },
          })
        ) {
          setOWLs((previousState) => ({
            ...previousState,
            [owl.from]: previousState[owl.from].filter((existingOwl) => existingOwl.id !== owl.id),
          }));
        }
      }}
    />
  );
}
