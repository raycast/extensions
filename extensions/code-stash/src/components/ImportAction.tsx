import { Action, Icon } from "@raycast/api";
import ImportForm from "./ImportForm";

function ImportAction(props: { onImport: (files: string[]) => void }) {
  return (
    <Action.Push
      icon={Icon.Download}
      title="Import Code Stashes"
      shortcut={{ modifiers: ["cmd"], key: "i" }}
      target={<ImportForm onImport={(files) => props.onImport(files)} />}
    />
  );
}

export default ImportAction;
