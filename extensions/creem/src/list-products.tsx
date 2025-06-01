import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, useCachedPromise, useForm } from "@raycast/utils";
import { CreateProductRequestEntity, ProductEntity } from "creem/dist/commonjs/models/components";
import { useState } from "react";
import { API_KEY, creem } from "./creem";

export default function ListProducts() {
  const [filterStatus, setFilterStatus] = useState("");

  const { isLoading, data, mutate } = useCachedPromise(
    async () => {
      const res = await creem.searchProducts({ xApiKey: API_KEY });
      return res.items;
    },
    [],
    {
      initialData: [],
    },
  );

  function getProductPriceText(product: ProductEntity) {
    let text = product.currency + product.price / 100;
    if (product.billingType !== "onetime") {
      text += "/";
      switch (product.billingPeriod) {
        case "every-month":
          text += "month";
          break;
        case "every-three-months":
          text += "3 months";
          break;
        case "every-six-months":
          text += "6 months";
          break;
        case "every-year":
          text += "year";
          break;
      }
    }
    return text;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Status" onChange={setFilterStatus}>
          <Form.Dropdown.Item title="All" value="" />
          <Form.Dropdown.Item title="Active" value="active" />
          <Form.Dropdown.Item title="Archived" value="archived" />
        </List.Dropdown>
      }
    >
      {!isLoading && !data.length && (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create Product" target={<CreateProduct mutate={mutate} />} />
            </ActionPanel>
          }
        />
      )}
      {data
        .filter((product) => !filterStatus || product.status === filterStatus)
        .map((product) => (
          <List.Item
            key={product.id}
            icon="product.svg"
            title={product.name}
            accessories={[
              {
                tag:
                  product.status === "active" ? "Active" : product.status === "archived" ? "Archived" : product.status,
              },
              { text: getProductPriceText(product) },
              {
                date: new Date(product.createdAt),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Product ID" content={product.id} />
                <Action.Push icon={Icon.Plus} title="Create Product" target={<CreateProduct mutate={mutate} />} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

function CreateProduct({ mutate }: { mutate: MutatePromise<ProductEntity[]> }) {
  type FormValues = {
    name: string;
    description: string;
    billingType: string;
    currency: string;
    price: string;
    billingPeriod: string;
    taxCategory: string;
    taxMode: boolean;
  };
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating Product", values.name);
      const createProductRequestEntity: CreateProductRequestEntity = {
        ...values,
        price: +values.price,
        taxMode: values.taxMode ? "inclusive" : "exclusive",
      };

      try {
        await mutate(
          creem.createProduct({
            xApiKey: API_KEY,
            createProductRequestEntity,
          }),
        );
        toast.style = Toast.Style.Success;
        toast.title = "Created Product";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create";

        let message = `${error}`;

        const err = error as Error | { name: "APIError"; body: string };
        if ("body" in err) {
          const body: { message: string | string[] } = await JSON.parse(err.body);
          message = body.message instanceof Array ? body.message[0] : body.message;
        }
        toast.message = message;
      }
    },
    initialValues: {
      price: "0.00",
    },
    validation: {
      name: FormValidation.Required,
      description: FormValidation.Required,
      price(value) {
        if (!value) return "Price is required";
        const num = Number(value);
        if (isNaN(num)) return "Price must be a number";
        if (num < 0) return "Price cannot be negative";
      },
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
      <Form.Description
        title="Product Details"
        text="These are visible to the end user when purchasing your subscription"
      />
      <Form.TextField title="Name" placeholder="Creem SaaS" {...itemProps.name} />
      <Form.TextArea
        title="Description"
        placeholder="Smooth payments for SaaS and Indie Hackers that don't break the bank"
        {...itemProps.description}
        info="Product descriptions displayed to your customers"
      />

      <Form.Separator />
      <Form.Description
        title="Payment Details"
        text="These are the pricing details that will be charged for your product"
      />
      <Form.Dropdown title="Billing Type" {...itemProps.billingType}>
        <Form.Dropdown.Item title="Single payment" value="onetime" />
        <Form.Dropdown.Item title="Subscription" value="recurring" />
      </Form.Dropdown>
      <Form.Dropdown title="Currency" {...itemProps.currency}>
        <Form.Dropdown.Item title="EUR" value="EUR" />
        <Form.Dropdown.Item title="USD" value="USD" />
        <Form.Dropdown.Item title="SEK" value="SEK" />
      </Form.Dropdown>
      <Form.TextField title="Pricing" {...itemProps.price} />
      {values.billingType === "recurring" && (
        <Form.Dropdown title="Subscription interval" {...itemProps.billingPeriod}>
          <Form.Dropdown.Item title="Monthly" value="every-month" />
          <Form.Dropdown.Item title="3 Months" value="every-three-months" />
          <Form.Dropdown.Item title="6 Months" value="every-six-months" />
          <Form.Dropdown.Item title="Yearly" value="every-year" />
        </Form.Dropdown>
      )}
      <Form.Dropdown title="Tax Category" {...itemProps.taxCategory}>
        <Form.Dropdown.Item title="Digital goods or services" value="saas" />
        <Form.Dropdown.Item title="Software as a Service (SaaS)" value="saas" />
        <Form.Dropdown.Item title="Ebooks" value="saas" />
      </Form.Dropdown>
      <Form.Checkbox title="Tax Behaviour" label="Price includes tax" {...itemProps.taxMode} />
    </Form>
  );
}
