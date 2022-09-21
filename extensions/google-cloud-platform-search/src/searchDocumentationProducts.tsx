import { ActionPanel, List, showToast, Action, Toast, Clipboard } from "@raycast/api";
import { DiscoveryAPI, DocumentationProduct } from "./types";
import { useFetch } from "@raycast/utils";

export default function Command() {
  return <DocumentationProductsList />;
}

export function DocumentationProductsList() {
  const { data: products, isLoading } = useFetch<DocumentationProduct[]>(
    "https://www.googleapis.com/discovery/v1/apis",
    {
      parseResponse: async (res) => {
        const data = (await res.json()) as DiscoveryAPI;
        return data.items.filter((item) => item.preferred);
      },
      onError: (error) => {
        showToast({
          title: "Could not fetch available products from GCP.",
          message: "Please check your Internet Connection!",
          style: Toast.Style.Failure,
          primaryAction: {
            title: "Copy Error",
            onAction: () => Clipboard.copy(error.message),
          },
        });
      },
    }
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search products by name...">
      {products?.map((product) => (
        <DocumentationProductListItem key={product.id} product={product} />
      ))}
    </List>
  );
}

function DocumentationProductListItem(props: { product: DocumentationProduct }) {
  return (
    <List.Item
      title={props.product.title}
      icon="command-icon.png"
      actions={
        <ActionPanel title={props.product.title}>
          <Action.OpenInBrowser title="Open Documentation" url={props.product.documentationLink} />
          <Action.CopyToClipboard title="Copy Documentation URL" content={props.product.documentationLink} />
        </ActionPanel>
      }
    />
  );
}
