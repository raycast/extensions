import { ConsoleProduct, Project } from "./types";
import { ActionPanel, List, OpenInBrowserAction } from "@raycast/api";
import { consoleProducts } from "./consoleProducts";

export function ProductList(props: { project: Project }) {
  return (
    <List searchBarPlaceholder={`Search products for ${props.project.displayName}...`}>
      {consoleProducts?.map((product) => (
        <ProjectListItem key={product.name} product={product} project={props.project} />
      ))}
    </List>
  );
}

function ProjectListItem(props: { product: ConsoleProduct; project: Project }) {
  const productUrl = props.product.toUrl(props.project.projectId);
  return (
    <List.Item
      title={props.product.name}
      accessoryTitle={props.project.projectId}
      icon="command-icon.png"
      actions={
        <ActionPanel title={props.product.name}>
          <OpenInBrowserAction title="Open in Browser" url={productUrl} />
        </ActionPanel>
      }
    />
  );
}
