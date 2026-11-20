import { FooterActions } from "./components/Footer";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ListingSearch } from "./components/ListingSearch";
import { Obj, extractArray, pick } from "./lib/format";
import { read, reportError } from "./lib/mcp";
import { sectionLabel } from "./lib/theme";

function Section({
  title,
  tool,
  keys,
  field,
  icon,
}: {
  title: string;
  tool: string;
  keys: string[];
  field: "category" | "country";
  icon: Icon;
}) {
  const { data, isLoading } = usePromise(read, [tool, {}], { onError: reportError });
  const items = data ? extractArray(data.data, keys) : [];
  return (
    <List.Section title={sectionLabel(title)} subtitle={isLoading ? "Loading…" : String(items.length)}>
      {items.map((o: Obj, i) => {
        const name = pick(o, ["name", "category", "country", "title", "label", "value"]) ?? `Item ${i + 1}`;
        const count = pick(o, ["count", "listings", "listing_count", "total"]);
        return (
          <List.Item
            key={`${field}-${name}`}
            title={name}
            icon={icon}
            accessories={count ? [{ text: `${Number(count).toLocaleString("en-GB")} listings`, tooltip: "Approved listings" }] : []}
            actions={
              <ActionPanel>
                <Action.Push title="Browse Listings" icon={Icon.List} target={<ListingSearch {...{ [field]: name }} />} />
                <FooterActions />
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}

export default function Command() {
  return (
    <List searchBarPlaceholder="Filter categories and countries…">
      <Section title="Categories" tool="list_categories" keys={["categories", "items"]} field="category" icon={Icon.Tag} />
      <Section title="Countries" tool="list_countries" keys={["countries", "items"]} field="country" icon={Icon.Globe} />
    </List>
  );
}
