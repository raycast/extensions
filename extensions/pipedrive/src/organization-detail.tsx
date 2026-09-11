import { Action, ActionPanel, Detail, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useRef } from "react";

import AddOrganization from "./add-organization";
import { buildPipedriveApiUrl, buildPipedriveWebUrl, fetchPipedriveJson, isAbortError } from "./pipedrive-client";

type OrganizationResponse = {
  data?: {
    id: number;
    name?: string;
    address?: string;
    owner_name?: string;
    people_count?: number;
    open_deals_count?: number;
    closed_deals_count?: number;
  };
};

export default function OrganizationDetail({ id }: { id: string }) {
  const preferences = getPreferenceValues<Preferences.Index>();
  const abortable = useRef<AbortController | null>(null);

  const { data, isLoading, revalidate } = useCachedPromise(
    async (organizationId: string) => {
      const url = buildPipedriveApiUrl(preferences, `/api/v1/organizations/${organizationId}`);
      const json = await fetchPipedriveJson<OrganizationResponse>(preferences, url, {
        method: "get",
        signal: abortable.current?.signal,
      });

      return { organization: json.data ?? null };
    },
    [id],
    {
      abortable,
      onError: (error) => {
        if (isAbortError(error)) return;
        const message = error instanceof Error ? error.message : String(error);
        void showToast({ style: Toast.Style.Failure, title: "Failed to load organization", message });
      },
    },
  );

  const organization = data?.organization;

  const markdown = useMemo(() => {
    const name = (organization?.name || "").trim() || `Organization ${id}`;
    const lines: string[] = [];

    lines.push("No photo");
    lines.push("");
    lines.push(`# ${name}`);

    const address = (organization?.address || "").trim();
    if (address) {
      lines.push("");
      lines.push(address);
    }

    return lines.join("\n");
  }, [id, organization?.address, organization?.name]);

  const itemUrl = buildPipedriveWebUrl(preferences.domain, `/organization/${id}`);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={(organization?.name || "Organization").trim() || "Organization"}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Edit Organization"
              target={
                <AddOrganization key={`edit-organization-${id}`} organizationIdToEdit={id} onSaved={revalidate} />
              }
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
          {(organization?.owner_name || "").trim() && (
            <Detail.Metadata.Label title="Owner" text={(organization?.owner_name || "").trim()} />
          )}
          {typeof organization?.people_count === "number" && (
            <Detail.Metadata.Label title="People" text={String(organization.people_count)} />
          )}
          {typeof organization?.open_deals_count === "number" && (
            <Detail.Metadata.Label title="Open Deals" text={String(organization.open_deals_count)} />
          )}
          {typeof organization?.closed_deals_count === "number" && (
            <Detail.Metadata.Label title="Closed Deals" text={String(organization.closed_deals_count)} />
          )}
          <Detail.Metadata.Link title="Pipedrive" target={itemUrl} text="Open organization" />
        </Detail.Metadata>
      }
    />
  );
}
