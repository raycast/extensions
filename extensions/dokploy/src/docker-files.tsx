import { Action, ActionPanel, Detail, Icon, Keyboard, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { type Instance, tokenForInstance } from "./instances";
import { DockerContainer } from "./interfaces";
import { parseTrpcJsonResponseSince, trpcQueryUrl } from "./trpc";

interface ContainerFileEntry {
  name: string;
  isDirectory: boolean;
}

interface ContainerFileContent {
  /** Base64, at most the first 512 KB of the file. */
  content: string;
  truncated: boolean;
}

function joinPath(base: string, name: string) {
  return base === "/" ? `/${name}` : `${base}/${name}`;
}

/**
 * Read-only browser for a running container's filesystem. Both routes run `docker exec` (`ls`,
 * `cat`) inside the container, so they only work while it's running, and not at all on an image
 * without shell utilities - Dokploy says so in its error, which is shown as-is.
 */
export default function DockerFiles({
  container,
  instance,
  path = "/",
}: {
  container: DockerContainer;
  instance: Instance;
  path?: string;
}) {
  const { url, headers } = tokenForInstance(instance);
  const {
    isLoading,
    data: entries,
    error,
    revalidate,
  } = useFetch<ContainerFileEntry[], ContainerFileEntry[]>(
    trpcQueryUrl(url, "docker.listContainerFiles", { containerId: container.containerId, path }),
    {
      headers,
      parseResponse: (response) => parseTrpcJsonResponseSince<ContainerFileEntry[]>(response, "v0.30.0"),
      initialData: [],
      // Shown in the empty view below instead.
      onError: () => {},
    },
  );

  const refreshAction = (
    <Action
      icon={Icon.ArrowClockwise}
      title="Refresh"
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => revalidate()}
    />
  );

  return (
    <List isLoading={isLoading} navigationTitle={`${container.name}:${path}`} searchBarPlaceholder={`Search ${path}`}>
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not list files"
          description={`${error}`}
          actions={<ActionPanel>{refreshAction}</ActionPanel>}
        />
      ) : isLoading ? null : (
        <List.EmptyView
          icon={Icon.Folder}
          title="Empty Folder"
          description={path}
          actions={<ActionPanel>{refreshAction}</ActionPanel>}
        />
      )}
      {entries.map((entry) => {
        const entryPath = joinPath(path, entry.name);
        return (
          <List.Item
            key={entry.name}
            icon={entry.isDirectory ? Icon.Folder : Icon.Document}
            title={entry.name}
            actions={
              <ActionPanel>
                {entry.isDirectory ? (
                  <Action.Push
                    icon={Icon.Folder}
                    title="Open Folder"
                    target={<DockerFiles container={container} instance={instance} path={entryPath} />}
                  />
                ) : (
                  <Action.Push
                    icon={Icon.Eye}
                    title="View File"
                    target={<DockerFile container={container} instance={instance} path={entryPath} />}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={entryPath}
                  shortcut={Keyboard.Shortcut.Common.CopyPath}
                />
                {refreshAction}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function DockerFile({ container, instance, path }: { container: DockerContainer; instance: Instance; path: string }) {
  const { url, headers } = tokenForInstance(instance);
  const { isLoading, data, error } = useFetch<ContainerFileContent>(
    trpcQueryUrl(url, "docker.readContainerFile", { containerId: container.containerId, path }),
    {
      headers,
      parseResponse: (response) => parseTrpcJsonResponseSince<ContainerFileContent>(response, "v0.30.0"),
      // Shown in the view below instead.
      onError: () => {},
    },
  );

  const bytes = data ? Buffer.from(data.content, "base64") : undefined;
  // Same check Dokploy's own file viewer uses.
  const isBinary = bytes?.includes(0) ?? false;
  const text = bytes && !isBinary ? bytes.toString("utf8") : undefined;

  let markdown = "";
  if (error) {
    markdown = `## Could not read file\n\n${`${error}`.replace(/```/g, "\\`\\`\\`")}`;
  } else if (isBinary) {
    markdown = "## Binary file\n\nThis file isn't text, so it isn't shown here.";
  } else if (text !== undefined) {
    const note = data?.truncated ? "_Larger than 512 KB - only the first 512 KB is shown._\n\n" : "";
    markdown = `${note}\`\`\`\n${text.replace(/```/g, "\\`\\`\\`")}\n\`\`\``;
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${container.name}:${path}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          {text !== undefined && <Action.CopyToClipboard title="Copy Content" content={text} />}
          <Action.CopyToClipboard title="Copy Path" content={path} shortcut={Keyboard.Shortcut.Common.CopyPath} />
        </ActionPanel>
      }
    />
  );
}
