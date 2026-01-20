import { Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { OrderDomainModel } from "./types";

const { api_key } = getPreferenceValues<ExtensionPreferences>();
const API_URL = "https://api.nicnames.com/2/";
const API_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "x-api-key": api_key
};
export default function Domains() {
  const {isLoading, data: domains} = useFetch(API_URL + "domain", {
    headers: API_HEADERS,
    mapResult(result: {list: OrderDomainModel[]}) {
      return {
        data: result.list
      }
    },
    initialData: []
  });

  return <List isLoading={isLoading}>
    {domains.map(domainItem => <List.Item key={domainItem.oid} icon={
      domainItem.status.includes("active") ? {value: {source: Icon.EllipsisVertical, tintColor: Color.Green}, tooltip: "Active"}
      : {value: {source: Icon.EllipsisVertical, tintColor: Color.Red}, tooltip: "Inactive"}
    } title={domainItem.domain.name}  />)}
  </List>
}
