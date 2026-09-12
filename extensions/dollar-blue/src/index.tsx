import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import prettyBuilder from "./pretty-builder";

export default function Command() {
  const { isLoading, data, revalidate } = useFetch<Response>(`https://api.bluelytics.com.ar/v2/latest`);

  return (
    <Detail
      isLoading={isLoading}
      markdown={prettyBuilder(data)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Last update" text={`${new Date(data?.last_update || "").toLocaleString()}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Source" text="Bluelytics" target="https://bluelytics.com.ar/" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Reload" icon={Icon.Repeat} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}
