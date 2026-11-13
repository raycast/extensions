// fallow-ignore-next-line unresolved-import
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getTags, getWorkspaceContext } from "./api/client";
import { getFigaTagsUrl, getFigaTagUrl } from "./api/links";
import { canReadResource } from "./format";
import { ReadCapabilityGate } from "./read-capability-gate";

async function loadTags() {
  const context = await getWorkspaceContext();
  const result = canReadResource(context, "tags") ? await getTags() : undefined;
  return { context, tags: result?.tags ?? [] };
}

export default function Command() {
  const { data, error, isLoading, revalidate } = usePromise(loadTags);
  return (
    <ReadCapabilityGate context={data?.context} error={error} onRetry={revalidate} resource="tags">
      <List isLoading={isLoading} searchBarPlaceholder="Search workspace tags">
        <List.EmptyView
          icon={Icon.Tag}
          title={isLoading ? "Loading tags" : "No tags found"}
          description="Create workspace tags in Figa, then select them when adding expenses."
          actions={
            <ActionPanel>
              {data ? (
                <Action.OpenInBrowser
                  icon={Icon.Link}
                  title="Manage Tags in Figa"
                  url={getFigaTagsUrl(data.context.workspace.id)}
                />
              ) : null}
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
        {data?.tags.map((tag) => (
          <List.Item
            key={tag.id}
            title={tag.name}
            icon={Icon.Tag}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  icon={Icon.Link}
                  title="Open Tag in Figa"
                  url={getFigaTagUrl(data.context.workspace.id, tag.id)}
                />
                <Action.CopyToClipboard icon={Icon.CopyClipboard} title="Copy Tag Name" content={tag.name} />
                <Action.CopyToClipboard icon={Icon.Hashtag} title="Copy Tag ID" content={tag.id} />
                <Action.OpenInBrowser
                  icon={Icon.Link}
                  title="Manage Tags in Figa"
                  url={getFigaTagsUrl(data.context.workspace.id)}
                />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    </ReadCapabilityGate>
  );
}
