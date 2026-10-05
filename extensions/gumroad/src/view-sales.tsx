import { List, ActionPanel, Action, Icon, Color, Keyboard } from "@raycast/api";
import { getAccessToken, useFetch, withAccessToken } from "@raycast/utils";
import { useState, useEffect } from "react";
import { SalesResponse, ProductsResponse, Sale } from "./types";
import { formatDate } from "./utils";
import { SaleDetails } from "./sale-details";
import { BASE_URL, SALES_ENDPOINT, PRODUCTS_ENDPOINT } from "./const";
import { provider } from "./oauth";

export default withAccessToken(provider)(Command);

function Command() {
  const { token } = getAccessToken();
  const TOKEN_PARAM = `access_token=${token}`;
  const [pageUrl, setPageUrl] = useState<string>(`${BASE_URL}${SALES_ENDPOINT}?${TOKEN_PARAM}`);
  const [sales, setSales] = useState<Sale[] | undefined>(undefined);
  const [priceFilter, setPriceFilter] = useState<"all" | "paid">("all");
  const [filterValue, setFilterValue] = useState<string>("all_sales");
  const {
    data: salesData,
    isLoading: isLoadingSales,
    revalidate,
    error: errorSales,
  } = useFetch<SalesResponse>(pageUrl);
  const { data: productsData } = useFetch<ProductsResponse>(`${BASE_URL}${PRODUCTS_ENDPOINT}?${TOKEN_PARAM}`);

  useEffect(() => {
    if (salesData?.sales && !isLoadingSales) {
      setSales(sales ? [...sales, ...salesData.sales] : salesData.sales);
    }
  }, [salesData]);

  const loadMore = () => {
    if (salesData?.next_page_url) {
      setPageUrl(`${BASE_URL}${salesData.next_page_url}&${TOKEN_PARAM}`);
      revalidate();
    }
  };

  const onFilterChange = (newValue: string) => {
    setFilterValue(newValue);
    if (newValue === "all_sales" || newValue === "all_products") {
      setPriceFilter("all");
      setPageUrl(`${BASE_URL}${SALES_ENDPOINT}?${TOKEN_PARAM}`);
    } else if (newValue === "hide_zero") {
      setPriceFilter("paid");
      setPageUrl(`${BASE_URL}${SALES_ENDPOINT}?${TOKEN_PARAM}`);
    } else {
      setPriceFilter("all");
      setPageUrl(`${BASE_URL}${SALES_ENDPOINT}?${TOKEN_PARAM}&product_id=${newValue}`);
    }
    setSales([]);
    revalidate();
  };

  const filteredSales = sales?.filter((sale) => {
    if (priceFilter === "paid") {
      return sale.price > 0;
    }
    return true;
  });

  const toggleShortcut: Keyboard.Shortcut = {
    modifiers: process.platform === "darwin" ? ["cmd", "shift"] : ["ctrl", "shift"],
    key: "h",
  };

  return (
    <List
      isLoading={(isLoadingSales || sales === undefined) && !errorSales}
      searchBarAccessory={
        <List.Dropdown tooltip={"Filter Sales"} value={filterValue} onChange={onFilterChange}>
          <List.Dropdown.Section title="Price">
            <List.Dropdown.Item title="All Sales" value="all_sales" />
            <List.Dropdown.Item title="Hide $0 Sales" value="hide_zero" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Products">
            <List.Dropdown.Item title="All Products" value="all_products" />
            {productsData?.products.map((product) => (
              <List.Dropdown.Item key={product.id} title={product.name} value={product.id} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredSales?.map((sale) => (
        <List.Item
          key={sale.id}
          title={sale.product_name}
          subtitle={formatDate(sale.created_at)}
          icon={{ source: Icon.Coins, tintColor: Color.SecondaryText }}
          accessories={[
            {
              text: String(sale.formatted_total_price),
              icon: { source: Icon.BankNote, tintColor: Color.Green },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<SaleDetails sale={sale} />} icon={Icon.Sidebar} />
              <Action.CopyToClipboard title="Copy Customer Email" content={sale.email} />
              <Action
                title={priceFilter === "all" ? "Hide $0 Sales" : "Show All Sales"}
                onAction={() => onFilterChange(priceFilter === "all" ? "hide_zero" : "all_sales")}
                shortcut={toggleShortcut}
                icon={priceFilter === "all" ? Icon.EyeDisabled : Icon.Eye}
              />
            </ActionPanel>
          }
        />
      ))}
      {filteredSales && filteredSales?.length > 0 && salesData?.next_page_url && (
        <List.Item
          title="Load More"
          icon={{ source: Icon.Ellipsis, tintColor: Color.PrimaryText }}
          actions={
            <ActionPanel>
              <Action title="Load More" onAction={loadMore} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
