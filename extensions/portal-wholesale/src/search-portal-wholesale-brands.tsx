import { ActionPanel, Action, Grid, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface BrandLogo {
  url: string;
}

interface Brand {
  id: number;
  name: string;
  slug: string;
  headquarters_city: string;
  headquarters_country: string;
  brand_logo: BrandLogo;
}

type TRPCResponse = [
  {
    result: {
      data: Brand[];
    };
  },
];

const BASE_URL = "https://portalwholesale.com";

function buildSearchUrl(searchText: string): string {
  const input = JSON.stringify({ "0": { searchQuery: searchText } });
  return `${BASE_URL}/trpc/brands.searchByNameOrWebsiteUrl?batch=1&input=${encodeURIComponent(input)}`;
}

function getBrandLogoUrl(brand: Brand): string | undefined {
  return brand.brand_logo?.url;
}

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

function formatLocation(brand: Brand): string {
  const country = brand.headquarters_country
    ? countryNames.of(brand.headquarters_country)
    : undefined;
  const parts = [brand.headquarters_city, country].filter(Boolean);
  return parts.join(", ");
}

export default function SearchBrands() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data: brands } = useFetch<Brand[]>(
    buildSearchUrl(searchText),
    {
      execute: searchText.length > 0,
      parseResponse: async (response) => {
        const json = (await response.json()) as TRPCResponse;
        return json[0]?.result?.data ?? [];
      },
    },
  );

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder="Search for a brand by name or website..."
      onSearchTextChange={setSearchText}
      throttle
      columns={5}
      inset={Grid.Inset.Medium}
    >
      {searchText.length === 0 ? (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Start typing to search for brands"
        />
      ) : (brands ?? []).length === 0 && !isLoading ? (
        <Grid.EmptyView
          icon={Icon.XMarkCircle}
          title="No brands found"
          description={`No results for "${searchText}"`}
        />
      ) : (
        (brands ?? []).map((brand) => (
          <Grid.Item
            key={brand.id}
            title={brand.name}
            subtitle={formatLocation(brand)}
            content={getBrandLogoUrl(brand) ?? Icon.Building}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Open">
                  <Action.OpenInBrowser
                    title="Open Brand Page"
                    url={`${BASE_URL}/brands/${brand.slug}`}
                    icon={Icon.Globe}
                  />
                  <Action.OpenInBrowser
                    title="Open Organization Admin"
                    url={`${BASE_URL}/admin/organizations/redirect-for-brand?slug=${brand.slug}`}
                    icon={Icon.Gear}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Brand Name"
                    content={brand.name}
                    icon={Icon.Text}
                  />
                  <Action.CopyToClipboard
                    title="Copy Brand Page URL"
                    content={`${BASE_URL}/brands/${brand.slug}`}
                    icon={Icon.Link}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
