import path from "node:path";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { Profile } from "heartwood-ts";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { formatNodeId, pluralize } from "./utils";
import { useAlias } from "./alias";
import { useCobs } from "./cobs";
import { useNode } from "./node";

interface Project {
  name: string;
  description: string;
  defaultBranch: string;
  delegates: string[];
  threshold: number;
  visibility: { type: "private" | "public" };
  head: string;
  id: string;
}

export default function Command() {
  const [profile] = useState(Profile.init());

  const { data, isLoading, error } = useCachedPromise(populateRepos);

  if (error) {
    return (
      <List>
        <List.EmptyView icon="notfound.svg" title="Error fetching projects." />
      </List>
    );
  }

  async function populateRepos() {
    const repos: Project[] = [];
    for (const { rid } of await profile.storage.repositories()) {
      try {
        const repo = profile.storage.repository(rid);
        const head = await repo.head();
        const doc_at = await repo.identity_head();
        const doc = await repo.doc_at(doc_at);

        repos.push({
          ...doc,
          name: doc.payload["xyz.radicle.project"].name,
          defaultBranch: doc.payload["xyz.radicle.project"].defaultBranch,
          description: doc.payload["xyz.radicle.project"].description,
          visibility: doc.visibility || { type: "public" },
          head,
          id: rid,
        });
      } catch (error) {
        console.error(`Error fetching project ${rid}: ${error}`);
        continue;
      }
    }

    return repos.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {data?.length === 0 ? (
        <List>
          <List.EmptyView key="empty" icon="notfound.svg" title="No project in your storage found." />
        </List>
      ) : (
        data?.map((project) => <ListItem key={project.id} project={project} profile={profile} />)
      )}
    </List>
  );
}

function ListItem({ project, profile }: { project: Project; profile: Profile }) {
  const p = getPreferenceValues();
  const cache = path.join(profile.home.cobs, "cache.db");
  const node = path.join(profile.home.node, "node.db");

  const { data, permissionView } = useCobs({
    path: cache,
    rid: project.id,
  });

  if (permissionView) {
    return permissionView;
  }

  const { data: seeding } = useNode({
    path: node,
    rid: project.id,
  });

  function buildAccessories() {
    const accessories: { text: string; icon: string }[] = [];
    if (data.openPatches > 0) {
      accessories.push({ text: `${data.openPatches.toString()}`, icon: "patch.svg" });
    }
    if (data.openIssues > 0) {
      accessories.push({ text: `${data.openIssues.toString()}`, icon: "issue.svg" });
    }
    accessories.push(
      ...[
        { text: project.delegates.length.toString(), icon: Icon.Person },
        { text: project.threshold.toString(), icon: "quorum.svg" },
        { text: seeding ? seeding.count.toString() : "0", icon: "seeding.svg" },
      ],
    );

    return accessories;
  }

  return (
    <List.Item
      key={project.id}
      title={project.name}
      subtitle={project.description}
      accessories={buildAccessories()}
      actions={
        <ActionPanel title="More Information">
          <Action.Push
            title="Show Details"
            target={<Project project={project} profile={profile} accessories={buildAccessories()}></Project>}
          />
          <Action.OpenInBrowser url={`${p.webUrl}/nodes/${p.seedNodeAddress}/rad:${project.id}`} />
          <Action.CopyToClipboard title="Copy Repository ID to Clipboard" content={`rad:${project.id}`} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function Project({
  project,
  profile,
  accessories,
}: {
  project: Project;
  profile: Profile;
  accessories: { text: string; icon: string }[];
}) {
  const p = getPreferenceValues();
  const { id, name, head } = project;
  const node = path.join(profile.home.node, "node.db");

  const { data, isLoading, permissionView } = useAlias({
    path: node,
    nids: project.delegates.map((did) => did.replace("did:key:", "")),
  });

  if (permissionView) {
    return permissionView;
  }

  const readme = useCachedPromise(
    async (head: string) => {
      const repo = profile.storage.repository(project.id);
      for (const path of [
        "README",
        "README.md",
        "README.markdown",
        "README.txt",
        "README.rst",
        "README.org",
        "Readme.md",
      ]) {
        try {
          return await repo.readme(head, path);
        } catch {
          // ignore
        }
      }
      return "No README found";
    },
    [head],
  );

  return (
    <Detail
      isLoading={isLoading}
      key={project.id}
      navigationTitle="Show a project"
      markdown={readme.data || ""}
      actions={
        <ActionPanel title={name}>
          <Action.CopyToClipboard title="Copy Repository ID to Clipboard" content={`rad:${id}`} />
          <Action.OpenInBrowser url={`${p.webUrl}/nodes/${p.seedNodeAddress}/rad:${project.id}`} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={project.name} />
          <Detail.Metadata.Label title="Repository Id" text={`rad:${project.id}`} />
          <Detail.Metadata.Label title="Head" text={project.head} />
          <Detail.Metadata.TagList title={pluralize("Delegate", project.delegates.length)}>
            {project.delegates.map((did) => {
              if (data) {
                const text = data.find((a) => `did:key:${a.id}` === did)?.alias || formatNodeId(did);
                return (
                  <Detail.Metadata.TagList.Item
                    key={did}
                    icon={Icon.Person}
                    text={text}
                    onAction={() => {
                      Clipboard.copy(did);
                      showToast({ title: "DID copied", message: `Successfully copied DID` });
                    }}
                  />
                );
              }
              return null;
            })}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Stats">
            {accessories &&
              accessories.map((a, i) => <Detail.Metadata.TagList.Item key={i} icon={a.icon} text={a.text} />)}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Visibility" text={project.visibility.type} />
        </Detail.Metadata>
      }
    />
  );
}
