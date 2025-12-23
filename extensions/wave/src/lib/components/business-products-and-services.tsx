import { List, ActionPanel, Action, Icon, useNavigation, showToast, Toast, Form } from "@raycast/api";
import { useCachedState, useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { API_URL } from "../config";
import { MUTATIONS } from "../gql/mutations";
import { Business, Result } from "../types";
import { useGetBusinessProductsAndServices, useGetValidIncomeAccounts, common } from "../wave";

export default function BusinessProductsAndServices({ business }: { business: Business }) {
  const [isShowingSubtitle, setIsShowingSubtitle] = useCachedState("show-products-subtitle", false);
  const { isLoading, data: products, revalidate } = useGetBusinessProductsAndServices(business.id);
  const isEmpty = !isLoading && !products.length;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search product">
      {isEmpty ? (
        <List.EmptyView
          title="You haven't added any products yet."
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add a Product or Service"
                target={<AddProductOrService businessId={business.id} onCreate={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Businesses / ${business.name} / Products & Services`}>
          {products.map((product) => (
            <List.Item
              key={product.id}
              icon={Icon.Box}
              title={product.name}
              subtitle={!isShowingSubtitle ? undefined : product.description}
              accessories={[{ text: product.price }]}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Text}
                    title="Toggle Subtitle"
                    onAction={() => setIsShowingSubtitle((prev) => !prev)}
                  />
                  <Action.Push
                    icon={Icon.Plus}
                    title="Add a Product or Service"
                    target={<AddProductOrService businessId={business.id} onCreate={revalidate} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function AddProductOrService({ businessId, onCreate }: { businessId: string; onCreate: () => void }) {
  const { pop } = useNavigation();
  const [isCreating, setIsCreating] = useState(false);
  const { isLoading: isLoadingValidBusinessAccounts, data: incomeAccounts } = useGetValidIncomeAccounts(businessId, [
    "INCOME",
    "DISCOUNTS",
    "OTHER_INCOME",
  ]);

  type FormValues = {
    name: string;
    description: string;
    unitPrice: string;
    incomeAccountId: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        setIsCreating(true);
        const response = await fetch(API_URL, {
          ...common(),
          body: JSON.stringify({
            query: MUTATIONS.createProductOrService,
            variables: {
              input: {
                businessId,
                ...values,
              },
            },
          }),
        });
        const result = (await response.json()) as Result<{ productCreate: { didSucceed: boolean } }>;
        if ("errors" in result) throw new Error(result.errors[0].message);
        if (!result.data.productCreate.didSucceed) throw new Error("Unknown Error");
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        onCreate();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create";
        console.log(error);
        toast.message = `${error}`;
      } finally {
        setIsCreating(false);
      }
    },
    initialValues: {
      unitPrice: "0.00",
    },
    validation: {
      name: FormValidation.Required,
      unitPrice(value) {
        if (value) {
          if (value.length > 25) return "Max 25 characters";
          if (value != "0.00" && !Number(value)) return "The item must be a number";
          const parts = value.split(".");
          if (parts[1]?.length > 5) return "Max of 5 decimal places";
        }
      },
    },
  });
  const isLoading = isLoadingValidBusinessAccounts || isCreating;
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Products and services that you buy from vendors are used as items on Bills to record those purchases, and the ones that you sell to customers are used as items on Invoices to record those sales." />
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.TextArea title="Description" {...itemProps.description} />
      <Form.TextField title="Price" {...itemProps.unitPrice} />
      <Form.Dropdown title="Income Account" {...itemProps.incomeAccountId}>
        {incomeAccounts.map((account) => (
          <Form.Dropdown.Item key={account.id} title={account.name} value={account.id} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
