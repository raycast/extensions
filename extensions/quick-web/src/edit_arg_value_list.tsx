import { deleteArgValue } from "./arg_value_repository";
import { Action, ActionPanel, Clipboard, Icon, List, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import EditArgValueCommand from "./edit_arg_value";
import Style = Toast.Style;

export default function EditArgValueList({
  argName,
  argValueList,
}: {
  argName: string;
  argValueList: string[] | undefined;
}) {
  const items = [
    <List.Item
      key="addNewArg"
      title="Add New Arg Value"
      icon={"add.png"}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.List}
            title="Add Arg Value"
            target={<EditArgValueCommand argName={argName} oldArgValue="" />}
          />
        </ActionPanel>
      }
    />,
  ];
  if (argValueList == undefined) {
    return <List>{items}</List>;
  }

  for (const argValue of argValueList) {
    items.push(
      <List.Item
        key={argValue}
        title={argValue}
        icon={"list-item.png"}
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.Pencil}
              title="Edit Arg Value"
              target={<EditArgValueCommand argName={argName} oldArgValue={argValue} />}
            />
            <Action
              icon={Icon.CopyClipboard}
              title="Copy Arg Value"
              onAction={() => Clipboard.copy(argValue).then(() => showHUD("copied to clipboard"))}
            />
            <Action
              icon={Icon.XMarkCircle}
              title="Delete Arg Value"
              onAction={async () => {
                if (await deleteArgValue(argName, argValue)) {
                  await popToRoot();
                  await showToast(Style.Success, "deleted successfully");
                }
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return <List>{items}</List>;
}
