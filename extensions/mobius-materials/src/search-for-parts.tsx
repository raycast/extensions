import { ActionPanel, Action, List, showToast, Toast, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import React from "react";

interface Manufacturer {
  uuid: string;
  name: string;
  image: string | null;
}

interface Category {
  uuid: string;
  name: string;
  description: string;
  long_description: string;
  parents: Array<{
    uuid: string;
    name: string;
    description: string;
    long_description: string;
    distance: number;
  }>;
}

interface Part {
  uuid: string;
  mpn: string;
  manufacturer: Manufacturer;
  description: string;
  best_image_url: string | null;
  category: Category | null;
  in_stock_quantity: number;
  summary_unit_price: string | null;
  summary_msrp: string | null;
  ships_from: string;
  date_code_summary: string | null;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Part[];
}

export default function SearchForParts() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading: fetchLoading } = useFetch<ApiResponse>(
    searchText.trim()
      ? `https://api.mobiusmaterials.com/api/v1/public/specific-parts?query=${encodeURIComponent(searchText.trim())}&ordering=summary_unit_price`
      : "",
    {
      execute: searchText.trim().length > 0,
      keepPreviousData: true,
      onError: (error) => {
        showToast(Toast.Style.Failure, "Search Failed", error.message);
      },
    },
  );

  const parts = data?.results || [];
  const hasSearched = searchText.trim().length > 0;

  const formatPrice = (price: string | null): string => {
    if (!price) return "N/A";
    const numPrice = parseFloat(price);
    return `$${numPrice.toFixed(2)}`;
  };

  const getDisplayInfo = (part: Part) => {
    const inStock = part.in_stock_quantity > 0;
    const price = part.summary_unit_price || part.summary_msrp;

    const subtitle = part.description || `${part.manufacturer.name} component`;

    const accessories: { text?: string; icon?: Icon; tag?: { value: string; color: Color } }[] = [];

    if (inStock) {
      accessories.push({
        tag: {
          value: `${part.in_stock_quantity.toLocaleString()} in stock`,
          color: Color.Green,
        },
      });
      if (price) {
        accessories.push({
          text: formatPrice(price),
          icon: Icon.Coins,
        });
      }
    } else {
      accessories.push({
        tag: {
          value: "Out of Stock",
          color: Color.Red,
        },
      });
    }

    accessories.push({
      text: part.manufacturer.name,
      icon: Icon.Building,
    });

    return { subtitle, accessories };
  };

  return (
    <List
      isLoading={fetchLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for parts by MPN, description, or manufacturer..."
      throttle
      filtering={false}
    >
      {hasSearched ? (
        <>
          <List.Section title="Results" subtitle={data ? `${data.count.toLocaleString()} parts found` : ""}>
            {parts.map((part) => {
              const { subtitle, accessories } = getDisplayInfo(part);
              const productUrl = `https://app.mobiusmaterials.com/products/${part.uuid}?utm_source=raycast`;

              return (
                <List.Item
                  key={part.uuid}
                  icon={part.best_image_url || part.manufacturer.image || Icon.ComputerChip}
                  title={part.mpn}
                  subtitle={subtitle}
                  accessories={accessories}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title="Open Product Page" url={productUrl} />
                      <Action.CopyToClipboard
                        // eslint-disable-next-line @raycast/prefer-title-case
                        title="Copy MPN"
                        content={part.mpn}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Product URL"
                        content={productUrl}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Description"
                        content={part.description}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>

          {parts.length === 0 &&
            (fetchLoading ? (
              // Since we use the previous data, if the previous search turned up empty, we need a placeholder for the empty view in order to not flash the "No parts found" message.  Also add a nbsp to the description to make sure the EmptyView doesn't wiggle around too much.
              <List.EmptyView title="Searching..." description=" " />
            ) : (
              <List.EmptyView
                title="No parts found"
                description="Try searching with a different term or check your spelling"
              />
            ))}
        </>
      ) : (
        <List.EmptyView
          title="Search Mobius Materials"
          description="Enter a part number, description, or manufacturer to search for electronic components"
        />
      )}
    </List>
  );
}
