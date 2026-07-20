import { ActionPanel, Action, Icon, List, openExtensionPreferences } from "@raycast/api";
import API from "../api/api";
import { useState } from "react";
import { Organization } from "../types/Organization";
import { InfomaniakResponse } from "../types/InfomaniakResponse";
import { usePromise } from "@raycast/utils";
import { Hosting } from "../types/Hosting";
import { AxiosError } from "axios";

type MetadataProps = {
  organization: Organization;
};

export default function BrowseOrganizationHostings(props: MetadataProps) {
  const [status, setStatus] = useState(200);

  const organization = props.organization;

  const { isLoading, data, pagination } = usePromise(
    (organization: Organization) => async (options: { page: number }) => {
      let result;
      try {
        result = await API.get<InfomaniakResponse<Hosting>>(
          "/1/products?account_id=" +
            organization.id.toString() +
            "&order_by=customer_name&per_page=100&order=asc&service_name=hosting&page=" +
            (options.page + 1).toString(),
        );
      } catch (error: unknown) {
        if (error instanceof AxiosError) {
          if (error.response?.status === 401) {
            setStatus(401);
            return { data: [], hasMore: false };
          }
          if (error.response?.status === 429) {
            setStatus(429);
            return { data: [], hasMore: false };
          }
        }
        throw error;
      }
      const data = result?.data?.data ?? [];
      const hasMore = result.data.pages > result.data.page;

      return { data: data, hasMore: hasMore };
    },

    [organization],
  );

  if (status === 401) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Key}
          title="Access token required"
          description="Please setup your access token in the settings."
          actions={
            <ActionPanel>
              <Action title="Open Extension Settings" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (status === 429) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.CircleDisabled}
          title="Too many requests"
          description="Please wait a little bit before retrying."
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {data?.map((site) => (
        <List.Item
          key={site.id}
          title={site.customer_name}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={
                  "https://manager.infomaniak.com/v3/hosting/" +
                  props.organization.id.toString() +
                  "/hosting/" +
                  site.id.toString() +
                  "/dashboard"
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
