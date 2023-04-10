import { ActionPanel, CopyToClipboardAction, Icon, List, OpenInBrowserAction, render } from "@raycast/api";
import { randomUUID } from "crypto";
import { useState } from "react";
import { Crate, getCrates } from "./api";

render(<Main />);

function Main(): JSX.Element {
  const [crates, setCrates] = useState<Crate[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(v: string): Promise<void> {
    setLoading(true);
    setCrates(await getCrates(v));
    setLoading(false);
  }

  return (
    <List isLoading={loading} onSearchTextChange={search} searchBarPlaceholder="Search for a crate..." throttle={true}>
      {crates.map((c) => {
        const id = c.name + randomUUID();
        return (
          <List.Item
            id={id}
            key={id}
            title={c.name}
            subtitle={c.version}
            accessoryTitle={c.downloads.toLocaleString()}
            accessoryIcon={Icon.Download}
            actions={
              <ActionPanel>
                <CopyToClipboardAction content={`${c.name} = "${c.version}"`} title="Copy Dependency Line" />
                <OpenInBrowserAction url={`https://crates.io/crates/${c.name}`} title="View on crates.io" />
                {c.documentationURL ? (
                  <OpenInBrowserAction url={c.documentationURL} title="Open Crate Documentation" />
                ) : (
                  <></>
                )}
                {c.homepageURL ? <OpenInBrowserAction url={c.homepageURL} title="Open Homepage" /> : <></>}
                {c.repositoryURL ? <OpenInBrowserAction url={c.repositoryURL} title="Open Repository" /> : <></>}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
