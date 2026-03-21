import { Action, ActionPanel, Detail, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useRef } from "react";

import AddDeal from "./add-deal";
import { buildPipedriveApiUrl, buildPipedriveWebUrl, fetchPipedriveJson, isAbortError } from "./pipedrive-client";

type DealResponse = {
  data?: {
    id: number;
    title?: string;
    value?: number;
    currency?: string;
    status?: string;
    stage_name?: string;
    org_name?: string;
    person_name?: string;
  };
};

export default function DealDetail({ id }: { id: string }) {
  const preferences = getPreferenceValues<Preferences.Index>();
  const abortable = useRef<AbortController | null>(null);

  const { data, isLoading, revalidate } = useCachedPromise(
    async (dealId: string) => {
      const url = buildPipedriveApiUrl(preferences, `/api/v1/deals/${dealId}`);
      const json = await fetchPipedriveJson<DealResponse>(preferences, url, {
        method: "get",
        signal: abortable.current?.signal,
      });

      return { deal: json.data ?? null };
    },
    [id],
    {
      abortable,
      onError: (error) => {
        if (isAbortError(error)) return;
        const message = error instanceof Error ? error.message : String(error);
        void showToast({ style: Toast.Style.Failure, title: "Failed to load deal", message });
      },
    },
  );

  const deal = data?.deal;

  const markdown = useMemo(() => {
    const title = (deal?.title || "").trim() || `Deal ${id}`;
    const lines: string[] = [];

    lines.push(`# ${title}`);

    const value = typeof deal?.value === "number" ? deal.value : null;
    const currency = (deal?.currency || "").trim();
    if (value !== null) {
      lines.push("");
      lines.push(`Value: ${value}${currency ? ` ${currency}` : ""}`);
    }

    const stage = (deal?.stage_name || "").trim();
    if (stage) {
      lines.push("");
      lines.push(`Stage: ${stage}`);
    }

    const status = (deal?.status || "").trim();
    if (status) {
      lines.push("");
      lines.push(`Status: ${status}`);
    }

    return lines.join("\n");
  }, [deal?.currency, deal?.stage_name, deal?.status, deal?.title, deal?.value, id]);

  const itemUrl = buildPipedriveWebUrl(preferences.domain, `/deal/${id}`);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={(deal?.title || "Deal").trim() || "Deal"}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Edit Deal"
              target={<AddDeal key={`edit-deal-${id}`} dealIdToEdit={id} onSaved={revalidate} />}
              icon="✏️"
            />
            <Action.OpenInBrowser
              title="Open in Browser"
              url={itemUrl}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "enter" },
                Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          {(deal?.org_name || "").trim() && (
            <Detail.Metadata.Label title="Organization" text={(deal?.org_name || "").trim()} />
          )}
          {(deal?.person_name || "").trim() && (
            <Detail.Metadata.Label title="Person" text={(deal?.person_name || "").trim()} />
          )}
          <Detail.Metadata.Link title="Pipedrive" target={itemUrl} text="Open deal" />
        </Detail.Metadata>
      }
    />
  );
}
