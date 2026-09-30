import { Action, ActionPanel, Icon, List } from "@raycast/api";
import ListItemDetailComponent from "./components/ListItemDetailComponent";
import { getUserPackages } from "./utils/hestia";
import { isValidApiUrl } from "./utils";
import InvalidUrlComponent from "./components/InvalidUrlComponent";

export default function ListUserPackages() {
  if (!isValidApiUrl()) return <InvalidUrlComponent />;

  const { isLoading, data: userPackages } = getUserPackages();

  return (
    <List isLoading={isLoading} isShowingDetail>
      {userPackages && (
        <List.Section title={`${Object.keys(userPackages).length} user packages`}>
          {Object.entries(userPackages).map(([userPackage, data]) => (
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
        </List.Section>
      )}
    </List>
  );
}
