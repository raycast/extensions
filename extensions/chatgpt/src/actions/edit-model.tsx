import { Action, Icon, useNavigation } from "@raycast/api";
import { useCommand } from "../hooks/useCommand";
import { useModelCatalog } from "../hooks/useModelCatalog";
import { commandIdFromModel } from "../utils/model-catalog";
import { CommandForm } from "../views/command/from";
import { ModelForm } from "../views/model/form";

export function EditModelAction({ modelId }: { modelId: string }) {
  const { push } = useNavigation();
  const commands = useCommand();
  const { catalog } = useModelCatalog();
  const commandId = commandIdFromModel(modelId);
  const command = commandId ? commands.data[commandId] : undefined;
  const model = catalog.models[modelId];
  if (!command && !model) return null;
  return (
    <Action
      title={command ? "Edit AI Command" : "Edit Model"}
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={() => push(command ? <CommandForm cmd={command} use={{ commands }} /> : <ModelForm model={model} />)}
    />
  );
}
