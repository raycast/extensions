import type { Project, Remote } from "../types";

import { Clipboard, Detail, Icon, showToast } from "@raycast/api";
import { pluralize, formatNodeId } from "../utils";

export function ProjectDetail({ project: p, remotes }: { project: Project; remotes: Remote[] }) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Name" text={p.name} />
      <Detail.Metadata.Label title="Repository Id" text={p.id} />
      <Detail.Metadata.Label title="Head" text={p.head} />
      <Detail.Metadata.TagList title={pluralize("Delegate", p.delegates.length)}>
        {p.delegates.map((delegate) => {
          const d = remotes.find((remote) => `did:key:${remote.id}` === delegate);
          if (d) {
            return (
              <Detail.Metadata.TagList.Item
                key={d.id}
                icon={Icon.Person}
                text={d.alias ?? formatNodeId(d.id)}
                onAction={() => {
                  Clipboard.copy(d.id);
                  showToast({ title: "NID copied", message: `Successfully copied ${d.alias} NID` });
                }}
              />
            );
          } else {
            return (
              <Detail.Metadata.TagList.Item
                key={delegate}
                text={delegate}
                onAction={() => {
                  Clipboard.copy(delegate);
                  showToast({ title: "DID copied", message: `Successfully copied DID` });
                }}
              />
            );
          }
        })}
      </Detail.Metadata.TagList>
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Stats">
        <Detail.Metadata.TagList.Item text={p.issues.open.toString()} icon="issue.svg" />
        <Detail.Metadata.TagList.Item text={p.patches.open.toString()} icon="patch.svg" />
        <Detail.Metadata.TagList.Item text={p.seeding.toString()} icon="seeding.svg" />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Visibility" text={p.visibility.type} />
    </Detail.Metadata>
  );
}
