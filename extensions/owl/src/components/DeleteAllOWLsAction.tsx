import { Action, Alert, confirmAlert, Icon, Keyboard } from "@raycast/api";
import { useCachedStorage } from "../hooks/storage";
import { OWLMapping } from "../types/owl";
import { StorageKey } from "../types/storage";

export function DeleteAllOWLsAction(props: Readonly<{ language: string }>) {
  const { language } = props;
  const [, setOWLs] = useCachedStorage<OWLMapping>(StorageKey.OWLS, {});

  return (
    <Action
      title={"Delete Owls"}
      style={Action.Style.Destructive}
      icon={Icon.Trash}
      shortcut={Keyboard.Shortcut.Common.Remove}
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Are you sure?",
            message: `Are you sure you want to delete all owls of ${language}?`,
            primaryAction: {
              title: "Delete",
              style: Alert.ActionStyle.Destructive,
            },
          })
        ) {
          setOWLs((previousState) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [language]: _, ...rest } = previousState;
            return rest;
          });
        }
      }}
    />
  );
}
