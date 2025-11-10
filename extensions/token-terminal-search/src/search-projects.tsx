import {
  ActionPanel,
  Action,
  List,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  Clipboard,
  closeMainWindow,
  Image,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import fetch from "node-fetch";
import { writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

interface Preferences {
  apiToken: string;
}

interface Project {
  data_id: string;
  slug: string;
  id: string;
  name: string;
  chains: string[];
  symbol: string;
  logo: string | null;
  is_new: boolean | null;
  is_datapartner: boolean | null;
  market_sectors: string[];
  tags: string[];
  is_chain: boolean | null;
  is_public: boolean | null;
  tier: string | null;
  flattened_tags: string[];
  listing_date: string | null;
  standardized_listing_date: string | null;
}

interface Product {
  data_id: string;
  product_id: string;
  product_name: string;
  symbol: string;
  tags: string[];
  logo: string;
  asset_metadata: {
    relation_to_the_project: string | null;
    addresses: Array<{
      chain_id: string | null;
      token_address: string | null;
      token_name: string | null;
      token_symbol: string | null;
    }>;
    coingecko_id: string | null;
    unique_asset_id: string | null;
    asset_type: string | null;
    asset_id: string | null;
  };
  project_slug: string;
  powered_by: string[];
  is_ecosystem: boolean;
  chain_ids: string[];
  market_sectors: string[];
  product_market_sector: {
    id: string | null;
    name: string | null;
  };
}

interface SearchItem {
  id: string;
  name: string;
  symbol: string;
  logo: string | null;
  type: "project" | "product";
  tags: string[];
  market_sectors: string[];
  subtitle?: string;
  slug: string;
  projectSlug?: string; // Only for products
}

interface ProjectsApiResponse {
  result: {
    data: {
      data: Project[];
    };
  };
}

interface ProductsApiResponse {
  result: {
    data: {
      data: Product[];
    };
  };
}

const LOGO_BASE_URL = "https://static1.tokenterminal.com";
const PROJECTS_API_ENDPOINT =
  "https://api.tokenterminal.com/trpc/projects.getProjects";
const PRODUCTS_API_ENDPOINT =
  "https://api.tokenterminal.com/trpc/products.getProducts";

async function copyLogoAsImage(logoUrl: string, projectName: string) {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) {
      throw new Error("Failed to download logo");
    }

    const arrayBuffer = await response.arrayBuffer();
    const tempPath = join(
      tmpdir(),
      `${projectName.replace(/[^a-z0-9]/gi, "_")}_logo.png`,
    );
    await writeFile(tempPath, new Uint8Array(arrayBuffer));

    await Clipboard.copy({ file: tempPath });
    await closeMainWindow();

    await showToast({
      style: Toast.Style.Success,
      title: "Logo copied!",
      message: `${projectName} logo copied to clipboard`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy logo",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default function SearchProjects() {
  const [items, setItems] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        // Fetch both projects and products in parallel
        const [projectsResponse, productsResponse] = await Promise.all([
          fetch(PROJECTS_API_ENDPOINT, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${preferences.apiToken}`,
              "Content-Type": "application/json",
            },
          }),
          fetch(PRODUCTS_API_ENDPOINT, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${preferences.apiToken}`,
              "Content-Type": "application/json",
            },
          }),
        ]);

        if (!projectsResponse.ok || !productsResponse.ok) {
          throw new Error("API request failed");
        }

        const projectsData =
          (await projectsResponse.json()) as ProjectsApiResponse;
        const productsData =
          (await productsResponse.json()) as ProductsApiResponse;

        // Transform projects to SearchItems
        const projectItems: SearchItem[] = projectsData.result.data.data.map(
          (project) => ({
            id: `project-${project.id}`,
            name: project.name,
            symbol: project.symbol,
            logo: project.logo,
            type: "project" as const,
            tags: project.tags,
            market_sectors: project.market_sectors,
            subtitle: project.is_chain ? "Chain" : "Project",
            slug: project.slug,
          }),
        );

        // Transform products to SearchItems
        const productItems: SearchItem[] = productsData.result.data.data.map(
          (product) => ({
            id: `product-${product.project_slug}-${product.asset_metadata.unique_asset_id || product.product_id}`,
            name: product.product_name,
            symbol: product.symbol,
            logo: product.logo,
            type: "product" as const,
            tags: product.tags,
            market_sectors: product.market_sectors,
            subtitle: product.product_market_sector.name || "Product",
            slug: product.product_id,
            projectSlug: product.project_slug,
          }),
        );

        setItems([...projectItems, ...productItems]);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch data",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredItems = items.filter((item) => {
    const searchLower = searchText.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.symbol.toLowerCase().includes(searchLower) ||
      item.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
      item.market_sectors.some((sector) =>
        sector.toLowerCase().includes(searchLower),
      )
    );
  });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search projects and products by name, symbol, or tag..."
      throttle
    >
      {filteredItems.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          subtitle={item.symbol}
          icon={
            item.logo
              ? {
                  source: `${LOGO_BASE_URL}${item.logo}`,
                  mask: Image.Mask.Circle,
                }
              : Icon.Circle
          }
          accessories={[
            {
              text: item.type === "product" ? "Product" : item.subtitle,
              icon: item.type === "product" ? Icon.Box : Icon.Circle,
            },
            { text: item.market_sectors[0] || "" },
          ]}
          actions={
            <ActionPanel>
              {item.logo && (
                <Action
                  title="Copy Logo as Image"
                  icon={Icon.Image}
                  onAction={() =>
                    copyLogoAsImage(`${LOGO_BASE_URL}${item.logo}`, item.name)
                  }
                />
              )}
              <Action.OpenInBrowser
                title={`Open ${item.type === "product" ? "Product" : "Project"}`}
                url={
                  item.type === "project"
                    ? `https://tokenterminal.com/explorer/projects/${item.slug}`
                    : `https://tokenterminal.com/explorer/projects/${item.projectSlug}/${item.slug}`
                }
              />
              <Action.CopyToClipboard
                title="Copy Logo URL"
                content={
                  item.logo
                    ? `${LOGO_BASE_URL}${item.logo}`
                    : "No logo available"
                }
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              />
              <Action.CopyToClipboard
                title="Copy Name"
                content={item.name}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
              />
              <Action.CopyToClipboard
                title="Copy Symbol"
                content={item.symbol}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
