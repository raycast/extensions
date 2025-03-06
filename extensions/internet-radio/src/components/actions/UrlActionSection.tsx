import { Action, ActionPanel } from "@raycast/api";
import { StationData } from "../../types";

export default function UrlActionSection(props: { data: StationData }) {
  const { data } = props;
  return (
    <ActionPanel.Section>
      <Action.OpenInBrowser title="Open Stream In Browser" url={data.stream as string} />
      {data.website ? <Action.OpenInBrowser title="Open Website" url={data.website as string} /> : null}

      <Action.CopyToClipboard title="Copy Stream URL" content={data.stream as string} />

      {data.website ? <Action.CopyToClipboard title="Copy Website URL" content={data.website as string} /> : null}
    </ActionPanel.Section>
  );
}
