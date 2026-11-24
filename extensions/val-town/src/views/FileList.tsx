import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { endpointOf, listFiles, webUrlFor } from "../lib/api";
import { errorMessage, fileIcon } from "../lib/format";
import type { ValFile } from "../lib/types";
import { FileDetail } from "./FileDetail";

export function FileList({ val, branch, path }: { val: string; branch: string; path?: string }) {
  const { data, isLoading, error } = useCachedPromise(
    (identifier: string, currentBranch: string, currentPath?: string) =>
      listFiles(identifier, { branch: currentBranch, path: currentPath }),
    [val, branch, path],
  );

  const files = data?.files ?? [];
  const directories = files.filter((file) => file.type === "directory");
  const documents = files.filter((file) => file.type !== "directory");

  return (
    <List isLoading={isLoading} navigationTitle={path ? `${val} / ${path}` : val} searchBarPlaceholder="Filter files">
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could not list files"
          description={errorMessage(error)}
        />
      ) : (
        <>
          <List.EmptyView icon={Icon.Folder} title="Nothing here" description="This directory is empty." />
          {directories.length > 0 ? (
            <List.Section title="Directories">
              {directories.map((file) => (
                <List.Item
                  key={file.id}
                  icon={fileIcon(file.type)}
                  title={file.name}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Open Directory"
                        icon={Icon.Folder}
                        target={<FileList val={val} branch={branch} path={file.path} />}
                      />
                      <Action.OpenInBrowser title="Open on Val Town" url={webUrlFor(val, file.path)} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ) : null}
          {documents.length > 0 ? (
            <List.Section title="Files">
              {documents.map((file) => (
                <FileRow key={file.id} val={val} branch={branch} file={file} />
              ))}
            </List.Section>
          ) : null}
        </>
      )}
    </List>
  );
}

function FileRow({ val, branch, file }: { val: string; branch: string; file: ValFile }) {
  const endpoint = endpointOf(file);

  return (
    <List.Item
      icon={fileIcon(file.type)}
      title={file.name}
      accessories={[
        { tag: file.type },
        { text: `v${file.version}` },
        { date: new Date(file.updatedAt), tooltip: `Updated ${new Date(file.updatedAt).toLocaleString()}` },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Open File"
              icon={Icon.Eye}
              target={<FileDetail val={val} branch={branch} file={file} />}
            />
            <Action.OpenInBrowser title="Open in Val Town Editor" url={webUrlFor(val, file.path)} />
            {endpoint ? <Action.OpenInBrowser title="Open Endpoint" url={endpoint} /> : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Path" content={file.path} />
            {endpoint ? <Action.CopyToClipboard title="Copy Endpoint" content={endpoint} /> : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
