import { Action, ActionPanel, Color, Detail, Icon, Image, List } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { ActorRunListItem } from "apify-client";
import { apify } from "./apify";
import { formatDate } from "./utils";

const STATUS_ICON: Partial<Record<ActorRunListItem["status"], Image.ImageLike>> = {
  SUCCEEDED: { source: Icon.Check, tintColor: Color.Green },
};

export default function Runs() {
  const { isLoading, data: runs } = useCachedPromise(
    async () => {
      const { items } = await apify.runs().list();
      return items;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {runs.map((run) => (
        <List.Item
          key={run.id}
          icon={{ value: STATUS_ICON[run.status], tooltip: run.status }}
          title={run.id}
          accessories={[
            { text: `Started ${formatDate(run.startedAt)}` },
            { text: `Finished ${formatDate(run.finishedAt)}` },
            { text: run.buildNumber, tooltip: "Build" },
            { tag: run.meta.origin, tooltip: "Origin" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Play} title="Get Run" target={<GetRun id={run.id} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function GetRun({ id }: { id: string }) {
  const { isLoading, data: run } = usePromise(async () => {
    const run = await apify.run(id).get();
    return run;
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={run?.statusMessage}
      metadata={
        run && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Run ID" text={run.id} />
            <Detail.Metadata.Link title="Container URL" text={run.containerUrl} target={run.containerUrl} />
          </Detail.Metadata>
        )
      }
    />
  );
}
