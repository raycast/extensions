import dayjs from "dayjs";
import relatimeTime from "dayjs/plugin/relativeTime";
import { API_URL, headers, parseResponse, useKeygenPaginated } from "./keygen";
import { DistributionStrategy, Product } from "./interfaces";
import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import OpenInKeygen from "./open-in-keygen";
import { FormValidation, useForm } from "@raycast/utils";
dayjs.extend(relatimeTime);

export default function Products() {
  const { isLoading, data: products, pagination, revalidate, error } = useKeygenPaginated<Product>("products");

  return (
    <List isLoading={isLoading} isShowingDetail pagination={pagination}>
      {!isLoading && !products.length && !error ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="New Product" target={<NewProduct onNew={revalidate} />} />
            </ActionPanel>
          }
        />
      ) : (
        products.map((product) => (
          <List.Item
            key={product.id}
            icon={Icon.Dot}
            title={product.id.slice(0, 8)}
            subtitle={product.attributes.name}
            keywords={[product.attributes.name]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Resource" />
                    <List.Item.Detail.Metadata.Label title="ID" text={product.id} />
                    <List.Item.Detail.Metadata.Label
                      title="Created"
                      text={dayjs(product.attributes.created).fromNow()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Updated"
                      text={dayjs(product.attributes.updated).fromNow()}
                    />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title="Attributes" />
                    <List.Item.Detail.Metadata.Label title="Name" text={product.attributes.name} />
                    <List.Item.Detail.Metadata.Label title="Code" text={product.attributes.code || "---"} />
                    {product.attributes.url ? (
                      <List.Item.Detail.Metadata.Link
                        title="URL"
                        text={product.attributes.url}
                        target={product.attributes.url}
                      />
                    ) : (
                      <List.Item.Detail.Metadata.Label title="URL" text="---" />
                    )}
                    <List.Item.Detail.Metadata.TagList title="Distribution Strategy">
                      <List.Item.Detail.Metadata.TagList.Item text={product.attributes.distributionStrategy} />
                    </List.Item.Detail.Metadata.TagList>
                    {product.attributes.platforms?.length ? (
                      <List.Item.Detail.Metadata.TagList title="Platforms">
                        {product.attributes.platforms.map((platform) => (
                          <List.Item.Detail.Metadata.TagList.Item key={platform} text={platform} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Platforms" text="---" />
                    )}
                    <List.Item.Detail.Metadata.TagList title="Permissions">
                      {product.attributes.permissions.map((permission) => (
                        <List.Item.Detail.Metadata.TagList.Item key={permission} text={permission} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <OpenInKeygen route={`products/${product.id}`} />
                <Action.Push icon={Icon.Plus} title="New Product" target={<NewProduct onNew={revalidate} />} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function NewProduct({ onNew }: { onNew: () => void }) {
  const { pop } = useNavigation();

  interface FormValues {
    name: string;
    code: string;
    url: string;
    distributionStrategy: string;
  }
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating Product", values.name);

      const attributes: Partial<Product["attributes"]> = {
        name: values.name,
        ...(values.code && { code: values.code }),
        ...(values.url && { url: values.url }),
        distributionStrategy: values.distributionStrategy as DistributionStrategy,
      };

      const body = {
        data: {
          type: "products",
          attributes,
        },
      };

      try {
        const response = await fetch(API_URL + "products", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        await parseResponse(response);
        toast.style = Toast.Style.Success;
        toast.title = "Created Product";
        onNew();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      distributionStrategy: "LICENSED",
    },
    validation: {
      name: FormValidation.Required,
      url(value) {
        if (value) {
          try {
            new URL(value);
          } catch {
            return "Must be a valid URL";
          }
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Attributes" />
      <Form.TextField title="Name" placeholder="Example App" info="The name of the product." {...itemProps.name} />
      <Form.TextField
        title="Code"
        placeholder="example"
        info="This can be used to lookup the product by a human-readable identifier."
        {...itemProps.code}
      />
      <Form.TextField
        title="URL"
        placeholder="https://example.com"
        info="A related URL for the product e.g. the marketing website, company website, etc. Must be a valid URL."
        {...itemProps.url}
      />
      <Form.Dropdown
        title="Distribution Strategy"
        info="The distribution strategy for releases. Licensed = only licensed users. Open = anybody, no license required. Closed = only admins."
        {...itemProps.distributionStrategy}
      >
        <Form.Dropdown.Item title="LICENSED" value="LICENSED" />
        <Form.Dropdown.Item title="OPEN" value="OPEN" />
        <Form.Dropdown.Item title="CLOSED" value="CLOSED" />
      </Form.Dropdown>
    </Form>
  );
}
