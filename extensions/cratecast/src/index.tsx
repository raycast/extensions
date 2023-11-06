import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { Crate, getCrates } from "./api";

export default function Command() {
  const [crates, setCrates] = useState<Crate[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(v: string): Promise<void> {
    setLoading(true);
    setCrates(await getCrates(v));
    setLoading(false);
  }

  function formatDownloads(downloads: number): string {
    if (downloads >= 1000000) return `${(downloads / 1000000).toFixed(1)}m`;
    if (downloads >= 1000) return `${(downloads / 1000).toFixed(1)}k`;
    return downloads.toLocaleString();
  }

  return (
    <List isLoading={loading} onSearchTextChange={search} searchBarPlaceholder="Search for a crate..." throttle>
      {crates.map((crate) => {
        const { id, name, version, downloads, documentationURL, homepageURL, repositoryURL, description } = crate;
        const actions = (
          <ActionPanel>
            <Action.CopyToClipboard content={`${name} = "${version}"`} title="Copy Dependency Line" />
            <Action.OpenInBrowser url={`https://crates.io/crates/${name}`} title="View on crates.io" />
            {documentationURL && <Action.OpenInBrowser url={documentationURL} title="Open Crate Documentation" />}
            {homepageURL && <Action.OpenInBrowser url={homepageURL} title="Open Homepage" />}
            {repositoryURL && <Action.OpenInBrowser url={repositoryURL} title="Open Repository" />}
          </ActionPanel>
        );

        return (
          <List.Item
            id={id}
            key={id}
            icon={"icon.png"}
            title={name}
            subtitle={description}
            accessories={[
              {
                text: `v${version}`,
              },
              {
                icon: Icon.Download,
                text: formatDownloads(downloads),
                tooltip: `${downloads.toLocaleString()} downloads`,
              },
            ]}
            actions={actions}
          />
        );
      })}
    </List>
  );
}
