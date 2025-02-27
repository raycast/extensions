import { useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL } from "./config";
import { NameserverSet, SuccessResult } from "./types";
import { Icon, List } from "@raycast/api";
import { parseResponse } from "./utils";

export default function ViewNameserverSets() {
  const { isLoading, data } = useFetch(API_URL + "nameserverSet", {
    headers: API_HEADERS,
    parseResponse,
    mapResult(result: SuccessResult<NameserverSet[]>) {
      return {
        data: result.data,
      };
    },
    initialData: [],
  });

  function generateMarkdown(nameservers: NameserverSet["nameservers"]) {
    return `
  | Nameservers |
  |-------------|
  ${nameservers.map((ns) => `| ${ns.nameserver} |`).join(`\n`)}
  `;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search nameserver set" isShowingDetail>
      {data.map((item) => (
        <List.Item
          key={item.nameserver_set_id}
          icon={Icon.List}
          title={item.name}
          detail={
            <List.Item.Detail
              markdown={generateMarkdown(item.nameservers)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="Type">
                    <List.Item.Detail.Metadata.TagList.Item text={item.type} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="Editable" icon={item.is_editable ? Icon.Check : Icon.Xmark} />
                  <List.Item.Detail.Metadata.Label
                    title="Deletable"
                    icon={item.is_deletable ? Icon.Check : Icon.Xmark}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Deprecated"
                    icon={item.is_deprecated ? Icon.Check : Icon.Xmark}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
