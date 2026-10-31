import { Color, Icon, List } from "@raycast/api";
import { typeIcon, userIcon } from "../lib/icons";
import { Issue, IssueLink } from "../lib/issue";
import { priorityIcon, priorityLabel } from "../lib/priority";

export const STATUS_COLORS = { todo: Color.SecondaryText, inProgress: Color.Blue, done: Color.Green };

/** Per relation, so the panel stays readable when an issue has many links. The rest are one ⌘L away. */
const LINKS_PER_RELATION = 5;

/** Links grouped by relation, in the order Jira lists them. */
export function byRelation(links: IssueLink[]): [string, IssueLink[]][] {
  const groups = new Map<string, IssueLink[]>();
  for (const link of links) groups.set(link.relation, [...(groups.get(link.relation) ?? []), link]);
  return [...groups];
}

/** The most characters a value shows, so long values all end at the same place, clear of their labels. */
const MAX_VALUE = 40;

/**
 * Raycast lets a long value run right up to its label, and spacing can't be set, so values are cut here: to
 * `room` characters, ending in "...". The list row and Jira have them in full.
 */
function cap(text: string, room = MAX_VALUE): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= room ? flat : `${flat.slice(0, Math.max(room - 3, 0)).trimEnd()}...`;
}

/** Cuts only the middle, like an issue's title between its key and status, so the whole is at most MAX_VALUE. */
function capBetween(before: string, middle: string, after = ""): string {
  const room = MAX_VALUE - before.length - after.length;
  return room < 8 ? cap(before + middle + after) : `${before}${cap(middle, room)}${after}`;
}

// Metadata only: with Markdown, Raycast gives it the top of the panel and pushes the metadata down,
// so the title is a row of its own.
export function IssueDetail({ issue }: { issue: Issue }) {
  const updated = new Date(issue.updated).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Summary" text={cap(issue.summary)} />
          <List.Item.Detail.Metadata.Link title="Issue" text={issue.key} target={issue.url} />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={issue.status.name}
              color={STATUS_COLORS[issue.status.category]}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Priority"
            text={priorityLabel(issue.priority)}
            icon={priorityIcon(issue.priority)}
          />
          <List.Item.Detail.Metadata.Label
            title="Assignee"
            text={issue.assignee?.displayName ?? "Unassigned"}
            icon={userIcon(issue.assignee)}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Type" text={issue.issueType} icon={typeIcon(issue.issueType)} />
          {issue.parent && (
            <List.Item.Detail.Metadata.Link
              title={`Parent ${issue.parent.issueType}`}
              text={capBetween(`${issue.parent.key} `, issue.parent.summary)}
              target={issue.parent.url}
            />
          )}
          {issue.epic && (
            <List.Item.Detail.Metadata.Label title="Epic" text={capBetween(`${issue.epic.key} `, issue.epic.summary)} />
          )}
          {issue.storyPoints !== undefined && (
            <List.Item.Detail.Metadata.Label title="Story Points" text={String(issue.storyPoints)} />
          )}
          <List.Item.Detail.Metadata.Separator />
          {issue.reporter && (
            <List.Item.Detail.Metadata.Label
              title="Reporter"
              text={issue.reporter.displayName}
              icon={userIcon(issue.reporter)}
            />
          )}
          <List.Item.Detail.Metadata.Label title="Updated" text={updated} />
          {/* Last, under its own heading, so the links read as a section apart from the issue's details. */}
          {issue.links && <List.Item.Detail.Metadata.Separator />}
          {/* Raycast drops rows whose title is empty once trimmed, so the gap is a zero-width space. */}
          {issue.links && <List.Item.Detail.Metadata.Label title={"\u200B"} />}
          {issue.links && (
            <List.Item.Detail.Metadata.Label
              title="Linked Work Items"
              text={String(issue.links.length)}
              icon={Icon.Link}
            />
          )}
          {issue.links &&
            byRelation(issue.links).flatMap(([relation, links]) => [
              ...links.slice(0, LINKS_PER_RELATION).map((link, index) => (
                <List.Item.Detail.Metadata.Link
                  key={`${relation}:${link.key}`}
                  // The relation names the first of its links only, so the column reads as a list.
                  title={index === 0 ? relation : ""}
                  text={capBetween(`${link.key} `, link.summary, link.status ? ` · ${link.status}` : "")}
                  target={link.url}
                />
              )),
              ...(links.length > LINKS_PER_RELATION
                ? [
                    <List.Item.Detail.Metadata.Label
                      key={`${relation}:more`}
                      title=""
                      text={`${links.length - LINKS_PER_RELATION} more · ⌘L`}
                    />,
                  ]
                : []),
            ])}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
