import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import Root from "./components/root";
import { GitRef } from "./data/gitRef";
import { Product } from "./data/product";
import { Workflow } from "./data/workflow";
import { fetchProducts } from "./helpers/fetchProducts";
import { fetchWorkflows } from "./helpers/fetchWorkflows";
import { startBuild } from "./helpers/startBuild";

interface State {
  isLoading: boolean;
  products?: Product[];
  workflows?: Workflow[];
  refs?: GitRef[];
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
        const result = await fetchWorkflows(selectedProduct!);
        setState((previous) => ({
          ...previous,
          isLoading: false,
          workflows: result.workflows,
          refs: result.refs,
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
        setState((previous) => ({ ...previous, isLoading: false, products: products }));
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

  const handleSubmit = async (id: string, branch: string) => {
    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Starting build",
      });

      setState((previous) => ({ ...previous, isLoading: true }));
      const run = await startBuild(id, branch);
      setState((previous) => ({ ...previous, isLoading: false }));
      await toast.hide();
    } catch (error) {
      console.error(error);
      setState({
        isLoading: false,
        error: error instanceof Error ? error : new Error("Something went wrong"),
      });
    }
  };

  return (
    <Root>
      <Form
        isLoading={state.isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Start build"
              onSubmit={(formValues) => {
                handleSubmit(formValues.workflow, formValues.branch);
              }}
            />
          </ActionPanel>
        }
      >
        {state.products && state.products.length > 0 ? (
          <Form.Dropdown id="product" title="Product" onChange={setSelectedProduct}>
            {state.products.map((product) => {
              return <Form.Dropdown.Item key={product.id} title={product.name} value={product.id} />;
            })}
          </Form.Dropdown>
        ) : null}

        {state.workflows && state.workflows.length > 0 ? (
          <Form.Dropdown id="workflow" title="Workflow">
            {state.workflows.map((workflow) => {
              return <Form.Dropdown.Item key={workflow.id} title={workflow.name} value={workflow.id} />;
            })}
          </Form.Dropdown>
        ) : null}

        {state.refs && state.refs.length > 0 ? (
          <Form.Dropdown id="branch" title="Branch">
            {state.refs.map((ref) => {
              return <Form.Dropdown.Item key={ref.id} title={ref.name} value={ref.id} />;
            })}
          </Form.Dropdown>
        ) : null}
      </Form>
    </Root>
  );
}
