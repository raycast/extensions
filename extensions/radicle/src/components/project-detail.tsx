import type { Project } from "../types";

import { Clipboard, Detail, Icon, showToast } from "@raycast/api";
import { pluralize, formatNodeId } from "../utils";

export function ProjectDetail({ project: p }: { project: Project }) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Name" text={p.name} />
      <Detail.Metadata.Label title="Repository Id" text={p.id} />
      <Detail.Metadata.Label title="Head" text={p.head} />
      <Detail.Metadata.TagList title={pluralize("Delegate", p.delegates.length)}>
        {p.delegates.map(({ id, alias }) => {
          return (
            <Detail.Metadata.TagList.Item
              key={id}
              icon={Icon.Person}
              text={alias ?? formatNodeId(id)}
              onAction={() => {
                Clipboard.copy(id);
                showToast({ title: "NID copied", message: `Successfully copied ${alias} NID` });
              }}
            />
          );
        })}
      </Detail.Metadata.TagList>
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Stats">
        <Detail.Metadata.TagList.Item text={p.issues.open.toString()} icon="issue.svg" />
        <Detail.Metadata.TagList.Item text={p.patches.open.toString()} icon="patch.svg" />
        <Detail.Metadata.TagList.Item text={p.seeding.toString()} icon="seeding.svg" />
        <Detail.Metadata.TagList.Item text={`${p.threshold}/${p.delegates.length}`} icon="quorum.svg" />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Visibility" text={p.visibility.type} />
    </Detail.Metadata>
  );
}
