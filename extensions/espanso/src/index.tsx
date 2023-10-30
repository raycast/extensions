import { Action, ActionPanel, Application, Clipboard, Detail, List, getFrontmostApplication } from "@raycast/api";
import { useEffect, useState } from "react";
import { $, ProcessOutput } from "zx";
import { commandNotFoundMd, noContentMd } from "./messages";
import { EspansoMatch } from "./types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<EspansoMatch[]>([]);
  const [error, setError] = useState<ProcessOutput | null>(null);
  const [application, setApplication] = useState<Application | undefined>(undefined);

  useEffect(() => {
    getFrontmostApplication().then((app) => {
      setApplication(app);
    });
  }, []);

  const pasteTitle = `Paste to ${application?.name}`;

  useEffect(() => {
    async function fetchData() {
      try {
        const { stdout: result } = await $`espanso match list -j`;
        let matches: EspansoMatch[] = JSON.parse(result);
        matches = matches.sort((a, b) => a.triggers[0].localeCompare(b.triggers[0]));
        setItems(matches);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof ProcessOutput ? err : null);
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (error) {
    const notFound = Boolean(error.stderr.match("command not found"));

    return notFound ? <Detail markdown={commandNotFoundMd} /> : <Detail markdown={error.stderr} />;
  }

  if (!isLoading && items.length === 0) {
    return <Detail markdown={noContentMd} />;
  }

  return (
    <List isShowingDetail isLoading={isLoading}>
      {items.map(({ triggers, replace }, index) => (
        <List.Item
          key={index}
          title={triggers.join(", ")}
          detail={<List.Item.Detail markdown={replace} />}
          actions={
            <ActionPanel>
              <Action title={pasteTitle} onAction={() => Clipboard.paste(replace)} />
              <Action.CopyToClipboard title="Copy Content" content={replace} />
              <Action.CopyToClipboard title="Copy Triggers" content={triggers.join(", ")} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
