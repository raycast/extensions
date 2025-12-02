import { List, ActionPanel, Action } from "@raycast/api";
import { AddressResponse, AddressType } from "./lib/get-address";
import { usePromise } from "@raycast/utils";

export default function main() {
  const addressType = AddressType.BOTH;
  const addressResponse = usePromise(() => addressType.getAddress());

  return (
    <List isLoading={addressResponse.isLoading}>
      <AddressDisplay response={addressResponse.data} addressType="v4" />
      <AddressDisplay response={addressResponse.data} addressType="v6" />
    </List>
  );
}

function AddressDisplay({ addressType, response }: { addressType: "v4" | "v6"; response?: AddressResponse }) {
  const data = response?.[addressType];

  if (data) {
    return (
      <List.Item
        title={`Your IP${addressType} address is ${data}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Address to Clipboard" content={data} />
          </ActionPanel>
        }
      />
    );
  } else {
    return null;
  }
}
