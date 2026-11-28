import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import path from "node:path";
import { isCmarksInstalled } from "./app";
import { abbreviateHome, loadRecentFiles } from "./cmarks";
import { FileActions, NotInstalledView } from "./search";

export default function Command() {
  const { data, isLoading } = usePromise(
    async () => {
      const installed = await isCmarksInstalled();
      const files = installed ? await loadRecentFiles() : [];
      return { installed, files };
    },
    [],
    { failureToastOptions: { title: "Couldn't read recent cmarks files" } },
  );

  const notInstalled = data !== undefined && !data.installed;
  const files = data?.files ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recent cmarks files…">
      {notInstalled ? (
        <NotInstalledView />
      ) : !isLoading && files.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No recent files"
          description="Files you open in cmarks will appear here."
        />
      ) : (
        files.map((file) => (
          <List.Item
            key={file}
            title={path.basename(file)}
            subtitle={abbreviateHome(path.dirname(file))}
            icon={Icon.Document}
            quickLook={{ path: file, name: path.basename(file) }}
            actions={<FileActions path={file} />}
          />
        ))
      )}
    </List>
  );
}
