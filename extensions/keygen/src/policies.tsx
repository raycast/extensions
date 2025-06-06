import dayjs from "dayjs";
import relatimeTime from "dayjs/plugin/relativeTime";
import { API_URL, headers, parseResponse, useKeygen } from "./keygen";
import { License, Policy, Product } from "./interfaces";
import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import OpenInKeygen from "./open-in-keygen";
import { FormValidation, useForm } from "@raycast/utils";
dayjs.extend(relatimeTime);

export default function Policies() {
  const { isLoading, data: policies = [], revalidate } = useKeygen<Policy[]>("policies", {execute: false});

  return <List isLoading={isLoading} isShowingDetail>
    {policies.map(policy => <List.Item key={policy.id} icon={Icon.Dot} title={policy.id.slice(0, 8)} detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Resource" />
      <List.Item.Detail.Metadata.Label title="ID" text={policy.id} />
      <List.Item.Detail.Metadata.Label title="Created" text={dayjs(policy.attributes.created).fromNow()} />
      <List.Item.Detail.Metadata.Label title="Updated" text={dayjs(policy.attributes.updated).fromNow()} />
      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label title="Attributes" />
      <List.Item.Detail.Metadata.Label title="" text="General" />
      <List.Item.Detail.Metadata.Label title="Name" text={policy.attributes.name || "--"} />
      {/* draton */}
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

      {/* <List.Item.Detail.Metadata.Label title="" text="Cryptography" /> */}
      {/* <List.Item.Detail.Metadata.Label title="" text="Cryptography" /> */}
      <List.Item.Detail.Metadata.Label title="" text="Machine Requirements" />
      <List.Item.Detail.Metadata.Label title="" text="Usage Requirements" />
      <List.Item.Detail.Metadata.Label title="" text="Scope Requirements" />
      <List.Item.Detail.Metadata.Label title="" text="Permissions" />
      <List.Item.Detail.Metadata.Label title="" text="Advanced" />
    </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
      <OpenInKeygen route={`policies/${policy.id}`} />
      <Action.Push icon={Icon.Plus} title="New Policy" target={<NewPolicy onNew={revalidate} />} />
    </ActionPanel>} />)}
  </List>
}

function NewPolicy({onNew}: {onNew: () => void}) {
  const {pop} = useNavigation();
  const { isLoading, data: products = [] } = useKeygen<Product[]>("products", { execute: true });

interface FormValues {
  name: string;
  duration: string;
  maxMachines: string;
  product: string;
}
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating Policy", values.name);

      const attributes: Partial<Policy["attributes"]> = {
        name: values.name
      }
      const body = {
        data: {
          type: "policies",
          attributes,
          relationships: {
            product: {
              data: {
                type: "product",
                id: values.product
              }
            }
          }
        }
      }

      try {
        const response = await fetch(API_URL + "policies", {
          method: "POST",
          headers,
          body: JSON.stringify(body)
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
      name: FormValidation.Required
    }
  })
  return <Form isLoading={isLoading} actions={<ActionPanel>
    <Action.SubmitForm icon={Icon.Check} title="Submit" onSubmit={handleSubmit} />
  </ActionPanel>}>
    <Form.Description text="Attributes" />
    <Form.TextField title="Name" placeholder="Name" info="The name of the policy." {...itemProps.name} />
    <Form.Dropdown title="Duration" info="The expiry duration for licenses that implement this policy." {...itemProps.duration}>
                  <Form.Dropdown.Item title="Unlimited" value="" />
                  <Form.Dropdown.Item title="1 Day" value="86400" />
                  <Form.Dropdown.Item title="2 Days" value="172800" />
                  <Form.Dropdown.Item title="3 Days" value="259200" />
                  <Form.Dropdown.Item title="4 Days" value="345600" />
                  <Form.Dropdown.Item title="5 Days" value="432000" />
                  <Form.Dropdown.Item title="1 Week" value="604800" />
                  <Form.Dropdown.Item title="2 Weeks" value="1209600" />
                  <Form.Dropdown.Item title="3 Weeks" value="1814400" />
                  <Form.Dropdown.Item title="4 Weeks" value="2419200" />
                  <Form.Dropdown.Item title="5 Weeks" value="3024000" />
                  <Form.Dropdown.Item title="1 Month" value="2592000" />
                  <Form.Dropdown.Item title="31 Days" value="2678400" />
                  <Form.Dropdown.Item title="32 Days" value="2764800" />
                  <Form.Dropdown.Item title="2 Months" value="5184000" />
                  <Form.Dropdown.Item title="3 Months" value="7776000" />
                  <Form.Dropdown.Item title="4 Months" value="10368000" />
                  <Form.Dropdown.Item title="5 Months" value="12960000" />
                  <Form.Dropdown.Item title="6 Months" value="15552000" />
                  <Form.Dropdown.Item title="9 Months" value="23328000" />
                  <Form.Dropdown.Item title="13 Months" value="34186698" />
                  <Form.Dropdown.Item title="1 Year" value="31536000" />
                  <Form.Dropdown.Item title="2 Years" value="63072000" />
                  <Form.Dropdown.Item title="3 Years" value="94608000" />
    </Form.Dropdown>
    {/* scheme */}
    {/* floating */}
    <Form.TextField title="Max Machines" info="The maximum number of machines a license implementing the policy can have activated." {...itemProps.maxMachines} />

    <Form.Description text="Relationships" />
    <Form.Dropdown title="Product" info="The product the policy is for." {...itemProps.product}>
      {products.map(product => <Form.Dropdown.Item key={product.id} title={`${product.id.slice(0,8)} ${product.attributes.name}`} value={product.id} />)}
    </Form.Dropdown>
  </Form>
}