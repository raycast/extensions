import { Icon, List } from "@raycast/api";
import useDomainFetch from "./utils/useDomainFetch";
import DomainItem from "./components/DomainItem";
import CategoryDropdown, { type SearchCategory } from "./components/CategoryDropdown";
import { useState } from "react";

export default function Command() {
  const [query, setQuery] = useState("");
  const { data, error, isLoading } = useDomainFetch(query);
  const [category, setCategory] = useState<SearchCategory>("all");

  return (
    <List
      throttle={true}
      isLoading={isLoading}
      searchBarPlaceholder="Search domains..."
      onSearchTextChange={setQuery}
      searchBarAccessory={<CategoryDropdown onCategoryChange={setCategory} />}
    >
      {/* empty view */}
      {error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Something went wrong" description="Please try again later" />
      ) : data?.type === "error-429" ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Too many requests"
          description="Please try again in a minute"
        />
      ) : (
        // default empty view seen initially
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Search for domain names" description="Type to see results" />
      )}

      {/* results */}
      {data?.type === "success" && (
        <>
          {(category === "all" || category === "extensions") && (
            <List.Section title="Extensions">
              {data.data.alternate_extensions.map((result) => (
                <DomainItem key={`extensions-${result.domain}`} result={result} />
              ))}
            </List.Section>
          )}
          {(category === "all" || category === "generator") && (
            <List.Section title="Generator">
              {data.data.suggestions.map((result) => (
                <DomainItem key={`generator-${result.domain}`} result={result} />
              ))}
            </List.Section>
          )}
          {(category === "all" || category === "premium") && (
            <List.Section title="Premium">
              {data.data.aftermarket_domains.map((result) => (
                <DomainItem
                  key={`premium-${result.domain}`}
                  result={{
                    domain: result.domain,
                    tld: result.tld,
                    availability: result.availability,
                    aftermarket: {
                      current_price: result.current_price,
                      currency: result.currency,
                      market: result.market,
                      lowest_bid: result.info.lowest_bid,
                    },
                    backlink: result.backlink,
                  }}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
