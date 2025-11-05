import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { exec } from "child_process";
import Workspaces from "./utils/workspaceStorage";

export default function Command() {
  const { isLoading, data, revalidate } = usePromise(async () => {
    const workspaces = Workspaces();
    return workspaces;
  }, []);

  function openWorkspace(path: string) {
    const pathVerified = path.replace(/"/g, '\\"');
    exec(`code ${pathVerified}`, (error, stdout, stderr) => {
      if (error || stderr) {
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: "Unable to open this workspace",
        });
      }
    });
  }

  return isLoading ? (
    <Detail isLoading={isLoading} />
  ) : data && data.length > 0 ? (
    <List>
      {data?.map((obj) => (
        <List.Item
          key={obj.path}
          icon={Icon.Folder}
          title={obj.name}
          subtitle={obj.path}
          actions={
            <>
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Open in Code"
                    icon="../assets/extension-icon.png"
                    onAction={() => openWorkspace(obj.path)}
                  />
                  <Action.ShowInFinder title="Show in Finder" path={obj.path} icon={Icon.Folder} />
                  <Action.OpenWith title="Open with" path={obj.path} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy Path to Clipboard" content={obj.path} />
                  <Action.CopyToClipboard title="Copy Name to Clipboard" content={obj.name} />
                </ActionPanel.Section>
              </ActionPanel>
            </>
          }
        />
      ))}
    </List>
  ) : (
    <List>
      <List.Item
        title="No workspaces found"
        actions={
          <ActionPanel>
            <Action title="Search Again" icon={Icon.Finder} onAction={() => revalidate()} />
          </ActionPanel>
        }
      />
    </List>
  );
}
