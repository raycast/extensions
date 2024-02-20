import { Action, ActionPanel, Application, Clipboard, Detail, List, getFrontmostApplication } from "@raycast/api";
import { useEffect, useState } from "react";
import { ProcessOutput } from "zx";
import { commandNotFoundMd, noContentMd } from "./content/messages";
import { NormalizedEspansoMatch } from "./lib/types";
import { getEspansoConfig, getMatches, sortMatches } from "./lib/utils";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<NormalizedEspansoMatch[]>([]);
  const [error, setError] = useState<ProcessOutput | null>(null);
  const [application, setApplication] = useState<Application | undefined>(undefined);

  useEffect(() => {
    getFrontmostApplication().then((app) => {
      setApplication(app);
    });
  }, []);

  const pasteTitle = `Paste to ${application?.name}`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { packages: packageFilesDirectory, match: matchFilesDirectory } = await getEspansoConfig();

        const packageMatches = getMatches(packageFilesDirectory, { packagePath: true });

        const userMatches = getMatches(matchFilesDirectory);

        const combinedMatches: NormalizedEspansoMatch[] = [...userMatches, ...packageMatches];

        const sortedMatches = sortMatches(combinedMatches);

        setItems(sortedMatches);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof ProcessOutput ? err : null);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (error) {
    const notFound = Boolean(/command not found/.exec(error.stderr));

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
          title={label ?? triggers.join(", ")}
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
