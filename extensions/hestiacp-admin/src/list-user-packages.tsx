import { Action, ActionPanel, Icon, List } from "@raycast/api";
import ListItemDetailComponent from "./components/ListItemDetailComponent";
import { getUserPackages } from "./utils/hestia";

export default function ListUserPackages() {
  const { isLoading, data: userPackages } = getUserPackages();

  return (
    <List isLoading={isLoading} isShowingDetail>
      {userPackages &&
        Object.entries(userPackages).map(([userPackage, data]) => (
          <List.Item
            key={userPackage}
            title={userPackage}
            icon={Icon.Box}
            accessories={[{ date: new Date(`${data.DATE} ${data.TIME}`) }]}
            detail={<ListItemDetailComponent data={data} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy to Clipboard as JSON"
                  icon={Icon.Clipboard}
                  content={JSON.stringify(data)}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
