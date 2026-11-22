import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { workItemUrl } from "../api";
import { useCachedPromise } from "@raycast/utils";
import { getComments, getRelations, getWorkItems, localizeImages } from "../api";
import { WorkItem } from "../types";
import { fmtHours, htmlToMarkdown, isStory, stateColor } from "../utils";
import { WorkItemActions } from "./WorkItemActions";

export function WorkItemDetail({
  item: initial,
  parent,
  onChange,
}: {
  item: WorkItem;
  parent?: WorkItem;
  onChange?: () => void;
}) {
  const { data: fresh, revalidate: reloadItem } = useCachedPromise(
    async (id: number) => (await getWorkItems([id]))[0],
    [initial.id],
  );
  const { data: comments, isLoading, revalidate: reloadComments } = useCachedPromise(getComments, [initial.id]);
  const item = fresh ?? initial;

  const done = () => {
    reloadItem();
    reloadComments();
    reloadRelations();
    onChange?.();
  };

  const description = htmlToMarkdown(item.descriptionHtml);
  const acceptance = htmlToMarkdown(item.acceptanceHtml);

  const md = [
    `# ${item.title}`,
    parent ? `*${parent.type} #${parent.id} · ${parent.title}*` : "",
    "## Description",
    description || "_No description_",
    acceptance ? `## Acceptance criteria\n${acceptance}` : "",
    `## Comments (${comments?.length ?? 0})`,
    ...(comments ?? []).map(
      (c) => `**${c.author}** · ${new Date(c.date).toLocaleString()}\n\n${htmlToMarkdown(c.html)}\n\n---`,
    ),
  ]
    .filter(Boolean)
    .join("\n\n");

  // Azure DevOps images need the PAT, so they are downloaded and shown from local copies.
  const { data: localized } = useCachedPromise(localizeImages, [md]);
  const placeholder = md.replace(/!\[[^\]]*\]\([^)]*\)/g, "_(loading image…)_");
  const { data: rel, revalidate: reloadRelations } = useCachedPromise(getRelations, [item.id]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`#${item.id}`}
      markdown={localized ?? placeholder}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={`${item.type} #${item.id}`} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={item.state} color={stateColor(item.state)} />
          </Detail.Metadata.TagList>
          {!isStory(item.type) && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Estimated work" text={fmtHours(item.estimate)} />
              <Detail.Metadata.Label title="Completed" text={fmtHours(item.completed)} />
              <Detail.Metadata.Label title="Remaining" text={fmtHours(item.remaining)} />
            </>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Assigned to" text={item.assignedTo ?? "Unassigned"} />
          <Detail.Metadata.Label title="Iteration" text={item.iterationPath.split("\\").pop() ?? ""} />
          {item.tags ? (
            <Detail.Metadata.TagList title="Tags">
              {item.tags.split(";").map((t) => (
                <Detail.Metadata.TagList.Item key={t} text={t.trim()} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          {rel && rel.items.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              {rel.items.map((r) => (
                <Detail.Metadata.Link
                  key={`${r.link}-${r.item.id}`}
                  title={r.link}
                  text={`#${r.item.id} ${r.item.title} · ${r.item.state}${
                    !isStory(r.item.type) && r.item.estimate !== undefined ? ` · ${fmtHours(r.item.estimate)}` : ""
                  }`}
                  target={workItemUrl(r.item.id)}
                />
              ))}
            </>
          )}
          {rel && rel.pullRequests.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              {rel.pullRequests.map((pr) => (
                <Detail.Metadata.Link
                  key={pr.id}
                  title={`PR ${pr.id} · ${pr.status}`}
                  text={`${pr.title}${pr.sourceBranch ? ` · ${pr.sourceBranch}${pr.targetBranch ? ` → ${pr.targetBranch}` : ""}` : ""}`}
                  target={pr.url ?? workItemUrl(item.id)}
                />
              ))}
            </>
          )}
          {rel && rel.commits.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              {rel.commits.map((c) => (
                <Detail.Metadata.Link
                  key={c.sha}
                  title={`Commit ${c.sha.slice(0, 7)}`}
                  text={`${c.message}${c.branch ? ` · ${c.branch}` : ""}`}
                  target={c.url ?? workItemUrl(item.id)}
                />
              ))}
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <WorkItemActions
          item={item}
          onDone={done}
          extra={
            rel && rel.items.length > 0 ? (
              <ActionPanel.Section title="Open Related Item">
                {rel.items.map((r) => (
                  <Action.Push
                    key={`${r.link}-${r.item.id}`}
                    title={`${r.link} · #${r.item.id} ${r.item.title}`}
                    icon={Icon.Sidebar}
                    target={<WorkItemDetail item={r.item} onChange={done} />}
                  />
                ))}
              </ActionPanel.Section>
            ) : undefined
          }
        />
      }
    />
  );
}
