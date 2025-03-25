import { useEffect, useState } from "react";
import { deleteUrlConfig, queryUrlConfigs, UrlConfigs } from "./url_repository";
import { Action, ActionPanel, Icon, List, popToRoot, showToast, Toast } from "@raycast/api";
import EditUrlConfigCommand from "./edit_url";
import Style = Toast.Style;

export default function EditUrlListCommand() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [urlConfigs, setUrlConfigs] = useState<UrlConfigs>();

  const items: JSX.Element[] = [];
  useEffect(() => {
    async function f() {
      const configs = await queryUrlConfigs();
      setUrlConfigs(configs);
    }

    f().then(() => setIsLoading(false));
  }, []);

  urlConfigs?.urlConfigs.forEach((value, webName) => {
    items.push(
      <List.Item
        key={webName}
        title={webName}
        icon={"list-item.png"}
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.Pencil}
              title="Edit Url Config"
              target={<EditUrlConfigCommand oldWebName={webName} urlConfigValue={value} />}
            />
            <Action
              icon={Icon.XMarkCircle}
              title="Delete Url Config"
              onAction={async () => {
                if (await deleteUrlConfig(webName, urlConfigs)) {
                  await popToRoot();
                  await showToast(Style.Success, "deleted successfully");
                }
              }}
            />
          </ActionPanel>
        }
      />
    );
  });

  return <List isLoading={isLoading}>{items}</List>;
}
