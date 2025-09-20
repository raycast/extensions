import { ActionPanel, List, Action } from "@raycast/api";
import { useState } from "react";
import { IpEmptyView } from "./components/ip-empty-view";
import { isEmpty, validateCIDR } from "./utils/validation-utils";
import { splitCIDR, CIDRDetail } from "./utils/cidr-utils";
import { PANEL_MAPPINGS } from "./utils/constants";

interface CIDRArgument {
  cidrStr: string;
}

export default function CIDRToIPRange(props: { arguments: CIDRArgument }) {
  const { cidrStr } = props.arguments;
  const [searchContent, setSearchContent] = useState<string>(cidrStr);
  const res = validateCIDR(searchContent);

  function convertCIDRToMap(detail: CIDRDetail) {
    return JSON.parse(JSON.stringify(detail));
  }

  return (
    <List
      searchBarPlaceholder={"Input IPv4 CIDR that needs to be converted"}
      searchText={searchContent}
      onSearchTextChange={setSearchContent}
      throttle={true}
    >
      {isEmpty(searchContent) ? (
        <IpEmptyView title={"Waiting for CIDR input"} />
      ) : !res.ok ? (
        <IpEmptyView title={`${res.val.msg}`} />
      ) : (
        Object.entries(convertCIDRToMap(splitCIDR(res.val))).map(([key, value], index) => {
          return (
            <List.Item
              key={index}
              icon={PANEL_MAPPINGS[key].icon}
              title={PANEL_MAPPINGS[key].itemName}
              subtitle={`${value}`}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    icon={PANEL_MAPPINGS[key].icon}
                    title={`Copy ${PANEL_MAPPINGS[key].itemName}`}
                    content={`${value}`}
                  />
                  <Action.CopyToClipboard title="Copy All Info" content={JSON.stringify(splitCIDR(res.val))} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
