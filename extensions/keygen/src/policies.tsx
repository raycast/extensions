import dayjs from "dayjs";
import relatimeTime from "dayjs/plugin/relativeTime";
import { API_URL, headers, MAX_PAGE_SIZE, parseResponse, useKeygenPaginated } from "./keygen";
import { Policy, Product } from "./interfaces";
import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import OpenInKeygen from "./open-in-keygen";
import { FormValidation, useForm } from "@raycast/utils";
dayjs.extend(relatimeTime);

export default function Policies() {
  const { isLoading, data: policies, pagination, revalidate, error } = useKeygenPaginated<Policy>("policies");

  return (
    <List isLoading={isLoading} isShowingDetail pagination={pagination}>
      {!isLoading && !policies.length && !error ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="New Policy" target={<NewPolicy onNew={revalidate} />} />
            </ActionPanel>
          }
        />
      ) : (
        policies.map((policy) => (
          <List.Item
            key={policy.id}
            icon={Icon.Dot}
            title={policy.id.slice(0, 8)}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Resource" />
                    <List.Item.Detail.Metadata.Label title="ID" text={policy.id} />
                    <List.Item.Detail.Metadata.Label
                      title="Created"
                      text={dayjs(policy.attributes.created).fromNow()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Updated"
                      text={dayjs(policy.attributes.updated).fromNow()}
                    />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title="Attributes" />
                    <List.Item.Detail.Metadata.Label title="" text="General" />
                    <List.Item.Detail.Metadata.Label title="Name" text={policy.attributes.name || "--"} />
                    <List.Item.Detail.Metadata.TagList title="Authentication Strategy">
                      <List.Item.Detail.Metadata.TagList.Item text={policy.attributes.authenticationStrategy} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Expiration Strategy">
                      <List.Item.Detail.Metadata.TagList.Item text={policy.attributes.expirationStrategy} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Expiration Basis">
                      <List.Item.Detail.Metadata.TagList.Item text={policy.attributes.expirationBasis} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Renewal Basis">
                      <List.Item.Detail.Metadata.TagList.Item text={policy.attributes.renewalBasis} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Transfer Strategy">
                      <List.Item.Detail.Metadata.TagList.Item text={policy.attributes.transferStrategy} />
                    </List.Item.Detail.Metadata.TagList>

                    {/* <List.Item.Detail.Metadata.Label title="Machine Requirements" text="" />
                    <List.Item.Detail.Metadata.Label title="Usage Requirements" text="" />
                    <List.Item.Detail.Metadata.Label title="Scope Requirements" text="" />
                    <List.Item.Detail.Metadata.Label title="Permissions" text="" />
                    <List.Item.Detail.Metadata.Label title="Advanced" text="" /> */}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <OpenInKeygen route={`policies/${policy.id}`} />
                <Action.Push icon={Icon.Plus} title="New Policy" target={<NewPolicy onNew={revalidate} />} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function NewPolicy({ onNew }: { onNew: () => void }) {
  const { pop } = useNavigation();
  const { isLoading, data: products = [] } = useKeygenPaginated<Product>("products", { pageSize: MAX_PAGE_SIZE });

  interface FormValues {
    name: string;
    duration: string;
    floating: boolean;
    maxMachines: string;
    product: string;
  }
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating Policy", values.name);

      const attributes: Partial<Policy["attributes"]> = {
        name: values.name,
        ...(values.duration && { duration: +values.duration }),
        floating: values.floating,
        ...(values.maxMachines && { maxMachines: +values.maxMachines }),
      };

      const body = {
        data: {
          type: "policies",
          attributes,
          relationships: {
            product: {
              data: {
                type: "product",
                id: values.product,
              },
            },
          },
        },
      };

      try {
        const response = await fetch(API_URL + "policies", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        await parseResponse(response);
        toast.style = Toast.Style.Success;
        toast.title = "Created Policy";
        onNew();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create";
        toast.message = `${error}`;
      }
    },
    validation: {
      name: FormValidation.Required,
      maxMachines(value) {
        if (value && (!Number(value) || Number(value) <= 0)) return "The item must be a positive number";
      },
    },
  });

  const DURATIONS = {
    86400: "1 Day",
    172800: "2 Days",
    259200: "3 Days",
    345600: "4 Days",
    432000: "5 Days",
    604800: "1 Week",
    1209600: "2 Weeks",
    1814400: "3 Weeks",
    2419200: "4 Weeks",
    3024000: "5 Weeks",
    2592000: "1 Month",
    2678400: "31 Days",
    2764800: "32 Days",
    5184000: "2 Months",
    7776000: "3 Months",
    10368000: "4 Months",
    12960000: "5 Months",
    15552000: "6 Months",
    23328000: "9 Months",
    34186698: "13 Months",
    31536000: "1 Year",
    63072000: "2 Years",
    94608000: "3 Years",
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Attributes" />
      <Form.TextField title="Name" placeholder="Name" info="The name of the policy." {...itemProps.name} />
      <Form.Dropdown
        title="Duration"
        info="The expiry duration for licenses that implement this policy."
        {...itemProps.duration}
      >
        <Form.Dropdown.Item title="Unlimited" value="" />
        {Object.entries(DURATIONS).map(([value, title]) => (
          <Form.Dropdown.Item key={value} title={title} value={value} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        label="Floating"
        info="When enabled, a license is valid across multiple machines. Though this is not enforced unless the policy is strict."
        {...itemProps.floating}
      />
      <Form.TextField
        title="Max Machines"
        placeholder=">0"
        info="The maximum number of machines a license implementing the policy can have activated."
        {...itemProps.maxMachines}
      />
      <Form.Separator />

      <Form.Description text="Relationships" />
      <Form.Dropdown title="Product" info="The product the policy is for." {...itemProps.product}>
        {products.map((product) => (
          <Form.Dropdown.Item
            key={product.id}
            title={`${product.id.slice(0, 8)} ${product.attributes.name}`}
            value={product.id}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
