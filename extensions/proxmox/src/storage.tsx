import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useStorageList } from "@/hooks/use-storage-list";
import { getStorageStatusIcon } from "@/utils/ui";
import { ErrorGuard } from "@/components/ErrorGuard";
import { StorageDetail } from "@/components/StorageDetail";
import { StorageContentList } from "@/screens/StorageContentList";

const Command = () => {
  const { isLoading, data, revalidate, showErrorScreen } = useStorageList();

  return (
    <ErrorGuard showErrorScreen={showErrorScreen}>
      <List
        isLoading={isLoading}
        isShowingDetail
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      >
        {data.map((storage) => (
          <List.Item
            key={storage.id}
            title={storage.storage}
            icon={{ ...getStorageStatusIcon(storage.status), tooltip: storage.status }}
            accessories={[{ text: storage.maxdiskParsed, tooltip: `Max disk: ${storage.maxdiskParsed}` }]}
            keywords={storage.contentTypes}
            detail={<StorageDetail storage={storage} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Content"
                  icon={Icon.List}
                  target={<StorageContentList node={storage.node} id={storage.storage} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    </ErrorGuard>
  );
};

export default Command;
