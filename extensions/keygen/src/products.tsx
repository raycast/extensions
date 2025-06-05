import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

enum LicenseStatus {
  ACTIVE="ACTIVE",
  INACTIVE="INACTIVE",
  EXPIRING="EXPIRING",
  EXPIRED="EXPIRED",
  SUSPENDED="SUSPENDED",
  BANNED="BANNED",
}
interface License {
  id: string;
  attributes: {
    name: string | null;
    key: string;
    status: LicenseStatus;
    created: string;
    updated: string;
  }
}
interface Result<T> {
  data: T;
}

interface Error {
  title: string;
  detail: string;
  code?: string;
}
interface ErrorResult {
  errors: Error[];
}

export default function Command() {
  const { account_id, api_token } = getPreferenceValues<Preferences>();
  const {isLoading, data: licenses} = useFetch(`https://api.keygen.sh/v1/accounts/${account_id}/licenses`, {
    headers: {
      Accept: "application/vnd.api+json",
      Authorization: `Bearer ${api_token}`,
      "Content-Type": "application/vnd.api+json"
    },
    async parseResponse(response) {
      if (!response.ok) {
        const err: ErrorResult = await response.json();
        throw new Error(err.errors[0].detail);
      }
      const result = await response.json();
      return result;
    },
    mapResult(result: Result<License[]>) {
      return {
        data: result.data
      }
    },
    initialData: [],
    execute: false 
  }) 

  return <List isLoading={isLoading} isShowingDetail>
    {licenses.map(license => <List.Item key={license.id} icon={Icon.Dot} title={license.id.slice(0, 8)} detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Resource" />
      <List.Item.Detail.Metadata.Label title="ID" text={license.id} />
      <List.Item.Detail.Metadata.Label title="Created" text={license.attributes.created} />
      <List.Item.Detail.Metadata.Label title="Updated" text={license.attributes.updated} />
      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label title="Attributes" />
      <List.Item.Detail.Metadata.Label title="Name" text={license.attributes.name || "--"} />
    </List.Item.Detail.Metadata>} />} />)}
  </List>
}
