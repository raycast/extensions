import { getAccessToken, showFailureToast, useFetch, withAccessToken } from "@raycast/utils";
import { provider } from "./oauth";
import { Action, ActionPanel, Detail, getPreferenceValues, LaunchProps } from "@raycast/api";
import { ErrorResult, ProductResult } from "./types";

export default withAccessToken(provider)(GetProductDetails);

function GetProductDetails(props: LaunchProps<{ arguments: Arguments.GetProductDetails }>) {
  const { client_id, account_id, is_sandbox } = getPreferenceValues<ExtensionPreferences>();
  const { token } = getAccessToken();
  const { product_number } = props.arguments;

  const { isLoading, data } = useFetch(
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
        return result as ProductResult;
      },
      onError(error) {
        showFailureToast(error, { title: `${error.cause || "Something went wrong"}` });
      },
    },
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${product_number} \n\n ${data ? `## ${data.Product.Description.ProductDescription} \n ${data.Product.Description.DetailedDescription} \n ![](${data.Product.PhotoUrl}) \n\n  \`\`\`json\n${JSON.stringify(data.Product, null, 4)}` : ""}`}
      actions={
        data && (
          <ActionPanel>{data.Product.ProductUrl && <Action.OpenInBrowser url={data.Product.ProductUrl} />}</ActionPanel>
        )
      }
    />
  );
}
