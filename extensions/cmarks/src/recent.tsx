import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import path from "node:path";
import { abbreviateHome, loadRecentFiles } from "./cmarks";
import { FileActions } from "./search";

export default function Command() {
  const { data, isLoading } = usePromise(loadRecentFiles);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recent cmarks files…">
      {!isLoading && (data?.length ?? 0) === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No recent files"
          description="Files you open in cmarks will appear here."
        />
      ) : (
        (data ?? []).map((file) => (
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
