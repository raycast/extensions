import { Color, List, Icon, Detail, ActionPanel, Action } from "@raycast/api";
import { EndOfLifeProductDetails } from "../types";
import useProductDetails from "../hooks/useProductDetails";
import isValidDate from "../utils/isValidDate";
import formatDate from "../utils/formatDate";
import { isEOL, isLTS } from "../utils/cycleUtils";

function ProductDetails({ product }: { product: string }) {
  const [cycles, isLoading] = useProductDetails(product);
  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle={product}>
      <EmptyView />
      <List.Section title="Product cycles">
        {cycles.map((cycle: EndOfLifeProductDetails) => (
          <List.Item
            id={`${product}-${cycle.cycle}`}
            key={cycle.cycle}
            title={`${product} ${cycle.cycle}`}
            detail={CycleView(product, cycle)}
            accessories={accessories(cycle)}
            actions={
              <ActionPanel title={product}>
                <Action.OpenInBrowser
                  title="View on endoflife.com"
                  url={`https://endoflife.date/${product}`}
                  icon={Icon.Rocket}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function accessories(cycle: EndOfLifeProductDetails) {
  const acc = [];
  if (isEOL(cycle)) {
    acc.push({ tag: { value: "EOL", color: Color.Red }, tooltip: "Cycle is end of life" });
  }
  if (isLTS(cycle)) {
    acc.push({ tag: { value: "LTS", color: Color.Green }, tooltip: "Cycle is LTS" });
  }
  return acc;
}

function EmptyView() {
  return <List.EmptyView icon="empty-view.png" description="No Cycles" />;
}

function CycleView(product: string, cycle: EndOfLifeProductDetails) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label key={`${product}-${cycle.cycle}`} title={`${product} ${cycle.cycle}`} />
          <List.Item.Detail.Metadata.Separator />
          {Object.entries(cycle)
            .sort(([key1], [key2]) => key1.localeCompare(key2))
            .map(([key]) => PropertyView(cycle, key))}
          <Detail.Metadata.Separator />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function PropertyView(cycle: EndOfLifeProductDetails, key: string) {
  const value = cycle[key];
  if (value === undefined || value === null) {
    return null;
  } else if (typeof value === "number") {
    return <List.Item.Detail.Metadata.Label key={key} title={key} text={value.toString()} />;
  } else if (typeof value === "boolean") {
    return <List.Item.Detail.Metadata.Label key={key} title={key} text={value ? "Yes" : "No"} />;
  } else if (typeof value === "string") {
    // is it a date?
    if (isValidDate(value)) {
      const dateValue = new Date(value);
      return <List.Item.Detail.Metadata.Label key={key} title={key} text={formatDate(dateValue)} />;
    }
    // is it a link?
    if (key === "link") {
      return <List.Item.Detail.Metadata.Link key={key} title={key} target={value} text={value} />;
    }
    // skip the cycle because it's in the heading
    if (key === "cycle") {
      return null;
    }
    // just return the text
    return <List.Item.Detail.Metadata.Label key={key} title={key} text={value} />;
  }
}

export default ProductDetails;
