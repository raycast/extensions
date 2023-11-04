import { Action, ActionPanel, Application, Clipboard, Detail, List, getFrontmostApplication } from "@raycast/api";

import { homedir } from "os";
import path from "path";
import { useEffect, useState } from "react";
import { ProcessOutput } from "zx";
import { commandNotFoundMd, noContentMd } from "./messages";
import { FormattedEspansoMatch } from "./types";
import { getMatches } from "./utils";

const matchFilesDirectory: string = path.join(homedir(), "Library/Application Support/espanso/match");

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<FormattedEspansoMatch[]>([]);
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
        const matches: FormattedEspansoMatch[] = getMatches(matchFilesDirectory);
        matches.sort((a, b) => {
          if (a.label && b.label) {
            return a.label.localeCompare(b.label);
          } else if (a.label) {
            return -1; // a has label, b does not
          } else if (b.label) {
            return 1; // b has label, a does not
          } else {
            return a.triggers[0].localeCompare(b.triggers[0]);
          }
        });

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
      {items.map(({ triggers, replace, label }, index) => (
        <List.Item
          key={index}
          title={label || triggers.join(", ")}
          subtitle={!label ? "" : triggers.join(", ")}
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
