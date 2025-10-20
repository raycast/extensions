import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { autumn } from "./autumn";
import { CreateProductParams } from "autumn-js";

export default function ManageProducts() {
  const {
    isLoading,
    data: products,
    error,
    mutate,
  } = useCachedPromise(
    async () => {
      const { data, error } = await autumn.products.list();
      if (error) throw new Error(error.message);
      return data.list;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {!isLoading && !products.length && !error ? (
        <List.EmptyView
          description="Each product defines features your customers get access to and how much they cost. Create separate products for any free plans, paid plans and any add-on or top up products ☝️"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create Product" target={<CreateProduct />} onPop={mutate} />
            </ActionPanel>
          }
        />
      ) : (
        products.map((product) => (
          <List.Item
            key={product.id}
            icon={Icon.Box}
            title={product.name}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Plus} title="Create Product" target={<CreateProduct />} onPop={mutate} />
                <Action icon={Icon.Trash} title="Delete Product" onAction={() => confirmAlert({
                                  title: "Delete Product",
                                  message: "Are you sure you want to delete this plan? This action cannot be undone.",
                                  primaryAction: {
                                    style: Alert.ActionStyle.Destructive,
                                    title: "Delete",
                                    async onAction() {
                                        const toast = await showToast(Toast.Style.Animated, "Deleting", product.id);
                                        try {
                                          await mutate(
                                            autumn.products.delete(product.id).then(({error}) => {
                                                if (error) throw new Error(error.message);
                                            }), {
                                              optimisticUpdate(data) {
                                                return data.filter(p => p.id!==product.id)
                                              },
                                              shouldRevalidateAfter: false
                                            }
                                          )
                                          toast.style = Toast.Style.Success;
                                          toast.title = "Deleted";
                                        } catch (error) {
                                          toast.style = Toast.Style.Failure;
                                          toast.title = "Failed";
                                          toast.message = `${error}`;
                                        }
                                    }
                                  }
                                })} style={Action.Style.Destructive} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CreateProduct() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<CreateProductParams>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        const { error } = await autumn.products.create(values);
        if (error) throw new Error(error.message);
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      id: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Product" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="eg. Starter Product" {...itemProps.name} />
      <Form.TextField title="ID" placeholder="eg. Product ID" {...itemProps.id} />
      <Form.Checkbox
        label="Default"
        info="This product is enabled by default for all new users, typically used for your free plan"
        {...itemProps.is_default}
      />
      <Form.Checkbox
        label="Add-on"
        info="This product is an add-on that can be bought together with your base products (eg, for top ups)"
        {...itemProps.is_add_on}
      />
    </Form>
  );
}
