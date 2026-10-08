import { ConsoleProduct, Project } from "./types";
import { ActionPanel, List, Action } from "@raycast/api";
import { getProductsByUsage, updateUsage } from "./usageCache";
import { useState } from "react";

export function ProductList(props: { project: Project }) {
  // NB: we use manual search filtering because Raycast's native fuzzy search doesn't retain the order of the items.
  //  Sorting by usage would only work with no search text.
  const [searchText, setSearchText] = useState<string>("");

  const products = getProductsByUsage(props.project.projectId);

  const searchLower = searchText.toLowerCase();
  const filtered = products.filter((product) => {
    return product.lowerName.includes(searchLower);
  });

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search products for ${props.project.displayName}...`}
    >
      {filtered.map((product) => (
        <ProjectListItem key={product.name} product={product} project={props.project} />
      ))}
    </List>
  );
}

function ProjectListItem(props: { product: ConsoleProduct; project: Project }) {
  const productUrl = props.product.toUrl(props.project.projectId);

  const onClickCallback = () => {
    updateUsage(props.project.projectId, props.product.name);
  };

  return (
    <List.Item
      title={props.product.name}
      icon="command-icon.png"
      actions={
        <ActionPanel title={props.product.name}>
          <Action.OpenInBrowser title="Open in Browser" url={productUrl} onOpen={onClickCallback} />
        </ActionPanel>
      }
      accessories={[
        {
          text: props.project.projectId,
        },
      ]}
    />
  );
}
