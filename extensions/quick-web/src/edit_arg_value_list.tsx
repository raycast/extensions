import { deleteArgValue } from "./arg_value_repository";
import { Action, ActionPanel, Icon, List, popToRoot, showToast, Toast } from "@raycast/api";
import EditArgCommand from "./edit_arg_value";
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
          <Action.Push title="Edit" target={<EditArgCommand argName={argName} oldArgValue="" />} />
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
            <Action.Push title="Edit" target={<EditArgCommand argName={argName} oldArgValue={argValue} />} />
            <Action
              title="Delete Arg"
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
