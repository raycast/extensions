import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { DocumentationProduct, Project } from "./types";
import { SWRConfig } from "swr";
import { cacheConfig } from "./swrCache";
import { useDocumentationProducts } from "./documentationProducts";

export default function Command() {
  return (
    <SWRConfig value={cacheConfig}>
      <DocumentationProductsList />
    </SWRConfig>
  );
}

export function DocumentationProductsList() {
  const { data, error, isValidating } = useDocumentationProducts();

  if (error) {
    showToast(
      ToastStyle.Failure,
      "Could not fetch avialable products from GCP, check your Internet Connection!",
      error.message
    );
  }

  return (
    <List isLoading={isValidating} searchBarPlaceholder="Search products by name...">
      {data?.map((product) => (
        <DocumentationProductListItem key={product.id} product={product} />
      ))}
    </List>
  )
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
