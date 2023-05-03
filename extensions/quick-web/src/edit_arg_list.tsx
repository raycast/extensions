import { ActionPanel, List, Action, LocalStorage, confirmAlert, showToast, popToRoot, Toast } from "@raycast/api";
import AddArgCommand from "./add_arg";
import { queryArgValueList } from "./arg_value_repository";
import EditArgValueList from "./edit_arg_value_list";
import { useEffect, useState } from "react";
import { deleteArg, queryArgList, updateArg } from "./arg_repository";
import { deleteUrlConfig } from "./url_repository";
import Style = Toast.Style;
import EditArgCommand from "./edit_arg";

export default function Command() {
  const initItem = (
    <List.Item
      key="addNewArg"
      title="Add New Arg"
      icon="add.png"
      actions={
        <ActionPanel>
          <Action.Push title="Add New Arg" target={<AddArgCommand />} />
        </ActionPanel>
      }
    />
  );

  const [items, setItems] = useState<JSX.Element[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  useEffect(() => {
    async function f() {
      const argList = await queryArgList();
      const temp = [initItem];
      for (const arg of argList) {
        const argValueList = await queryArgValueList(arg);
        temp.push(
          <List.Item
            key={arg}
            title={arg}
            icon="list-item.png"
            actions={
              <ActionPanel>
                <Action.Push title="Edit Arg" target={<EditArgValueList argName={arg} argValueList={argValueList} />} />
                <Action.Push title="Rename Arg" target={<EditArgCommand oldArgName={arg} />} />
                <Action
                  title="Delete Arg"
                  onAction={async () => {
                    if (await deleteArg(arg)) {
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

      setItems(temp);
    }

    f().finally(() => setIsLoading(false));
  }, []);

  return <List isLoading={isLoading}>{items}</List>;
}
