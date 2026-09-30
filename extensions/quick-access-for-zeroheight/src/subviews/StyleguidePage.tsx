import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

import { getContentOrDefault, isContentEmpty } from "../utils";
import { StyleguideStatusTagDetailMetadataLabel } from "./StyleguideStatusTagDetailMetadataLabel";
import { usePage } from "../hooks/usePage";

interface StyleguidePageProps {
  pageId: number;
}

export function StyleguidePage({ pageId }: StyleguidePageProps) {
  const { data, isLoading, revalidate } = usePage(pageId);

  return (
    <Detail
      navigationTitle={data?.name ?? "Page"}
      isLoading={isLoading}
      markdown={data ? getContentOrDefault(data) : ""}
      metadata={
        data &&
        !isContentEmpty(data) && (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Access method"
              text={data.locked ? "Private" : "Public"}
              icon={data.locked ? Icon.Lock : Icon.LockUnlocked}
            />
            <Detail.Metadata.Label
              title="Visibility"
              text={data.hidden ? "Hidden" : "Visible"}
              icon={data.hidden ? Icon.EyeDisabled : Icon.Eye}
            />
            <StyleguideStatusTagDetailMetadataLabel pageId={pageId} />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {data && <Action.OpenInBrowser url={data.url} />}
          <Action title="Reload" onAction={() => revalidate()} />
        </ActionPanel>
      }
    />
  );
}
