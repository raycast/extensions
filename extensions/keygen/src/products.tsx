import { getPreferenceValues, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface License {
  id: string;
  attributes: {
    key: string;
  }
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
        const err: { errors: Array<{ title: string; detail: string; code: string }> } = await response.json();
        throw new Error(err.errors[0].detail);
      }
      const result = await response.json();
      return result;
    },
    mapResult(result: { data: License[] }) {
      return {
        data: result.data
      }
    },
    initialData: []
  })

  return <List isLoading={isLoading}>
    {licenses.map(license => <List.Item key={license.id} title={license.attributes.key} />)}
  </List>
}
