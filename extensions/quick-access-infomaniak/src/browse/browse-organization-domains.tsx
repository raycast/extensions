import { ActionPanel, Action, Icon, List, openExtensionPreferences } from "@raycast/api";
import API from "../api/api";
import { useState } from "react";
import { Organization } from "../types/Organization";
import { InfomaniakResponse } from "../types/InfomaniakResponse";
import { usePromise } from "@raycast/utils";
import { Domain } from "../types/Domain";

type MetadataProps = {
  organization: Organization;
}

export default function BrowseOrganizationDomains(props: MetadataProps) {
  const organizationId = props.organization.id;

  const [status, setStatus] = useState(200);

  const { isLoading, data, pagination } = usePromise(
    (organizationId) => async (options: { page: number }) => {
      const response = await API.get<InfomaniakResponse<Domain>>('/1/products?account_id='+props.organization.id.toString()+'&order_by=customer_name&per_page=100&order=asc&service_name=domain&page='+(options.page+1).toString());

      if(response.status === 401) {
        setStatus(401);
        return {data: [], hasMore: false}
      }
      if(response.status === 429) {
        setStatus(429);
        return {data: [], hasMore: false}
      }

      const data = response?.data?.data ?? [];
      const hasMore = response.data.pages > response.data.page;
      
      return { data: data, hasMore: hasMore};
    },

    [props.organization]
  );

  if(status === 401) {
    return (<List isLoading={isLoading}>
      <List.EmptyView
        icon={Icon.Key}
        title="Access token required"
        description="Please setup your access token in the settings."
        actions={
          <ActionPanel>
            <Action
              title="Open extension settings"
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    </List>)
  }

  if(status === 429) {
    return(<List isLoading={isLoading}>
      <List.EmptyView
        icon={Icon.CircleDisabled}
        title="Too many requests"
        description="Please wait a little bit before retrying."
      />
    </List>)
  }

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {data?.map((domain) => (
        <List.Item
          key={domain.id}
          title={domain.customer_name}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser  url={"https://manager.infomaniak.com/v3/"+props.organization.id.toString()+"/ng/domain/"+domain.id.toString()+"/dashboard"} />
            </ActionPanel>
          }
        /> 
      ))}
    </List>
  );
}