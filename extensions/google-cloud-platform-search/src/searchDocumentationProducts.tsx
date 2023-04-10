import {
  ActionPanel,
  CopyToClipboardAction,
  Detail,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { DocumentationProduct } from "./types";
import { fetchDocumentationProducts } from "./documentationProducts";
import { useFetchWithCache } from "./useFetchWithCache";

const FAILURE_MESSAGE = `
# Google Cloud Platform Product Not Retrieved 😞

The request to retrieve the available products through the 
[Google Cloud Platform products API](https://www.googleapis.com/discovery/v1/apis) failed. 
Check your internet connection and retry!
`;

export default function Command() {
  return <DocumentationProductsList />;
}

export function DocumentationProductsList() {
  const { data, error, isLoading, failureMessage } = useFetchWithCache("documentation", fetchDocumentationProducts);

  if (error) {
    showToast(
      ToastStyle.Failure,
      "Could not fetch available products from GCP, check your Internet Connection!",
      error.message
    );
  }

  if (failureMessage) {
    return <Detail markdown={FAILURE_MESSAGE} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search products by name...">
      {data?.map((product) => (
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
          <OpenInBrowserAction title="Open Documentation" url={props.product.documentationLink} />
          <CopyToClipboardAction title="Copy Documentation URL" content={props.product.documentationLink} />
        </ActionPanel>
      }
    />
  );
}
