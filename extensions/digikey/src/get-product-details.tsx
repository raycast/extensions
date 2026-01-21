import { getAccessToken, showFailureToast, useFetch, withAccessToken } from "@raycast/utils";
import { provider } from "./oauth";
import { Detail, Form, getPreferenceValues, LaunchProps, List } from "@raycast/api";

export default withAccessToken(provider)(GetProductDetails);
interface ErrorResult {
  "title": string
  "status": number
  "detail": string
}
function GetProductDetails(props: LaunchProps<{arguments: Arguments.Search}>) {
  const {client_id, account_id, is_sandbox} = getPreferenceValues<ExtensionPreferences>();
  const {token} = getAccessToken();
  const {product_number} = props.arguments;
  
  const {isLoading, data } = useFetch(`https://${is_sandbox ? "sandbox-" : ""}api.digikey.com/products/v4/search/${product_number}/productdetails`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-DIGIKEY-Account-Id": account_id,
      "X-DIGIKEY-Client-Id": client_id,
    },
    async parseResponse(response) {
      const result = await response.json();
      if (!response.ok) {
        const err = result as ErrorResult;
        throw new Error(err.detail, {cause: err.title});
      }
      return result;
    },
    onError(error) {
      showFailureToast(error, {title: `${error.cause || "Something went wrong"}`})
    },
  })

  return <Detail isLoading={isLoading} markdown={`# ${product_number} \n\n ${data ? `\`\`\`json\n${JSON.stringify(data, null, 4)}` : ""}`} />
}