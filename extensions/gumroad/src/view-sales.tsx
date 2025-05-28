import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
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
  const [productId, setProductId] = useState<string>("");
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

  const onProductChange = (newValue: string) => {
    setProductId(newValue);
    if (newValue === "") {
      setPageUrl(`${BASE_URL}${SALES_ENDPOINT}?${TOKEN_PARAM}`);
    } else {
      setPageUrl(`${BASE_URL}${SALES_ENDPOINT}?${TOKEN_PARAM}&product_id=${newValue}`);
    }
    setSales([]);
    revalidate();
  };

  return (
    <List
      isLoading={(isLoadingSales || sales === undefined) && !errorSales}
      searchBarAccessory={
        <List.Dropdown tooltip={"Select Product"} value={productId} onChange={onProductChange}>
          <List.Dropdown.Section title="Products">
            <List.Dropdown.Item title="All Products" value="" />
            {productsData?.products.map((product) => (
              <List.Dropdown.Item key={product.id} title={product.name} value={product.id} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {sales?.map((sale) => (
        <List.Item
          key={sale.id}
          title={sale.product_name}
          subtitle={formatDate(sale.created_at)}
          icon={{ source: Icon.Coins, tintColor: Color.Magenta }}
          accessories={[
            {
              text: sale.formatted_total_price,
              icon: { source: Icon.BankNote, tintColor: Color.Green },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<SaleDetails sale={sale} />} icon={Icon.Sidebar} />
            </ActionPanel>
          }
        />
      ))}
      {sales && sales?.length > 0 && salesData?.next_page_url && (
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
