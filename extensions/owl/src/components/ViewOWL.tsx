import { ActionPanel, Detail } from "@raycast/api";
import { OWL } from "../types/owl";
import { getHistoryDepth } from "../utils/owl";
import { DeleteOWLAction } from "./DeleteOWLAction";

export default function ViewOWL(
  props: Readonly<{
    owl: OWL;
  }>,
) {
  const { owl } = props;

  return (
    <Detail
      markdown={`# ${owl.from} -> ${owl.to}\n\n![From Keyboard](keyboards/png/${encodeURIComponent(owl.from)}.png)${"-".repeat(100)}![To Keyboard](keyboards/png/${encodeURIComponent(owl.to)}.png)`}
      navigationTitle={`${owl.from} -> ${owl.to}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title={"From"} text={owl.from} />
          <Detail.Metadata.Label title={"To"} text={owl.to} />

          <Detail.Metadata.Separator />

          {owl.history
            .toSorted((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, getHistoryDepth())
            .map((history) => {
              return (
                <Detail.Metadata.Label
                  key={history.timestamp.toISOString()}
                  title={`${history.timestamp.toLocaleString()}: ${history.input}`}
                  text={history.output}
                />
              );
            })}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <DeleteOWLAction owl={owl} />
        </ActionPanel>
      }
    />
  );
}
