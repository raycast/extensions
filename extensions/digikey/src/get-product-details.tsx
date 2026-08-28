import { getAccessToken, showFailureToast, useFetch, useLocalStorage, withAccessToken } from "@raycast/utils";
import { provider } from "./oauth";
import { Action, ActionPanel, getPreferenceValues, Icon, LaunchProps, List } from "@raycast/api";
import { ErrorResult, ProductResult } from "./types";

export default withAccessToken(provider)(GetProductDetails);

function GetProductDetails(props: LaunchProps<{ arguments: Arguments.GetProductDetails }>) {
  const {
    isLoading,
    value: history = [],
    setValue: setHistory,
  } = useLocalStorage<Array<{ query: string; date: string } & ProductResult>>("history");
  const { client_id, account_id, is_sandbox } = getPreferenceValues<ExtensionPreferences>();
  const { token } = getAccessToken();
  const { product_number } = props.arguments;

  const { isLoading: isFetching } = useFetch(
    `https://${is_sandbox ? "sandbox-" : ""}api.digikey.com/products/v4/search/${product_number}/productdetails`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-DIGIKEY-Account-Id": account_id,
        "X-DIGIKEY-Client-Id": client_id,
      },
      async parseResponse(response) {
        const result = await response.json();
        if (!response.ok) {
          const err = result as ErrorResult;
          throw new Error(err.detail, { cause: err.title });
        }
        const res = result as ProductResult;
        const newItem = { query: product_number, date: new Date().toUTCString(), ...res };
        await setHistory([newItem, ...history]);
        return res;
      },
      onError(error) {
        showFailureToast(error, { title: `${error.cause || "Something went wrong"}` });
      },
    },
  );

  return (
    <List isLoading={isLoading || isFetching} isShowingDetail>
      {history.map((item, index) => (
        <List.Item
          key={item.date}
          icon={item.Product.PhotoUrl || "digikey.png"}
          title={item.query}
          detail={
            <List.Item.Detail
              markdown={`# ${item.query} \n\n ${`## ${item.Product.Description.ProductDescription} \n ${item.Product.Description.DetailedDescription} \n ![](${item.Product.PhotoUrl}) \n\n  \`\`\`json\n${JSON.stringify(item.Product, null, 4)}`}`}
            />
          }
          accessories={[{ date: new Date(item.date) }]}
          actions={
            <ActionPanel>
              {item.Product.ProductUrl && <Action.OpenInBrowser url={item.Product.ProductUrl} />}
              <Action
                icon={Icon.Trash}
                title="Remove from History"
                onAction={async () => {
                  const newHistory = history.toSpliced(index, 1);
                  await setHistory(newHistory);
                }}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
