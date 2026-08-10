import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Builds } from "./components/builds/Builds";
import Root from "./components/root";
import { BuildRun } from "./data/buildRun";
import { Product } from "./data/product";
import { fetchBuilds } from "./helpers/fetchBuilds";
import { fetchProducts } from "./helpers/fetchProducts";

interface State {
  isLoading: boolean;
  products?: Product[];
  builds?: BuildRun[];
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({ isLoading: false });
  const [selectedProduct, setSelectedProduct] = useState<string>();

  useEffect(() => {
    async function fetch() {
      if (selectedProduct === undefined) {
        return;
      }

      try {
        setState((previous) => ({ ...previous, isLoading: true }));
        const builds = await fetchBuilds(selectedProduct!);
        builds.sort((a, b) => b.number - a.number);
        setState((previous) => ({
          ...previous,
          isLoading: false,
          builds,
        }));
      } catch (error) {
        console.error(error);
        setState({
          isLoading: false,
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    console.debug("Fetching builds");

    fetch();
  }, [selectedProduct]);

  useEffect(() => {
    async function fetch() {
      try {
        setState((previous) => ({ ...previous, isLoading: true }));
        const products = await fetchProducts();
        setState((previous) => ({ ...previous, isLoading: false, products }));
      } catch (error) {
        console.error(error);
        setState({
          isLoading: false,
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    console.debug("Fetching products");

    fetch();
  }, []);

  if (state.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: state.error.message,
    });
  }

  return (
    <Root>
      <Builds
        isLoading={state.isLoading}
        searchBarAccessory={
          <List.Dropdown tooltip="Select Product" storeValue={true} onChange={(value) => setSelectedProduct(value)}>
            <List.Dropdown.Section title="Products">
              {state.products &&
                [...state.products.entries()].map(([_, product]) => (
                  <List.Dropdown.Item key={product.id} title={product.name} value={product.id} />
                ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        }
        product={state.products?.find((product) => product.id === selectedProduct)}
        builds={state.builds}
      />
    </Root>
  );
}
