import dayjs from "dayjs";
import relatimeTime from "dayjs/plugin/relativeTime";
import { API_URL, headers, parseResponse, useKeygen } from "./keygen";
import { License, Policy } from "./interfaces";
import { Action, ActionPanel, Form, Icon, List, showToast, Toast } from "@raycast/api";
import OpenInKeygen from "./open-in-keygen";
import { FormValidation, useForm } from "@raycast/utils";
dayjs.extend(relatimeTime);

export default function Licenses() {
  const { isLoading, data: licenses = [] } = useKeygen<License[]>("licenses", {execute: false});

  return <List isLoading={isLoading} isShowingDetail>
    {licenses.map(license => <List.Item key={license.id} icon={Icon.Dot} title={license.id.slice(0, 8)} detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Resource" />
      <List.Item.Detail.Metadata.Label title="ID" text={license.id} />
      <List.Item.Detail.Metadata.Label title="Created" text={dayjs(license.attributes.created).fromNow()} />
      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label title="Attributes" />
      <List.Item.Detail.Metadata.Label title="Name" text={license.attributes.name || "--"} />
      <List.Item.Detail.Metadata.Label title="Key" text={license.attributes.key} />
      {/* exopr */}
      <List.Item.Detail.Metadata.TagList title="Status">
        <List.Item.Detail.Metadata.TagList.Item text={license.attributes.status} />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label title="Machines" text={`${license.relationships.machines.meta.count} of ${license.attributes.maxMachines ?? "unlimited"}`} />
      <List.Item.Detail.Metadata.Label title="CPU Cores" text={`${license.relationships.machines.meta.cores} of ${license.attributes.maxCores ?? "unlimited"}`} />
      <List.Item.Detail.Metadata.Label title="Users" text={`${license.relationships.users.meta.count} of ${license.attributes.maxUsers ?? "unlimited"}`} />
      <List.Item.Detail.Metadata.TagList title="Protected">
        <List.Item.Detail.Metadata.TagList.Item text={`${license.attributes.protected}`} />
      </List.Item.Detail.Metadata.TagList>
      {/* scheme */}
      <List.Item.Detail.Metadata.TagList title="Suspended">
        <List.Item.Detail.Metadata.TagList.Item text={`${license.attributes.suspended}`} />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label title="Last Validation" text={license.attributes.lastValidated?.toString() || "--"} />
      {/* vlid */}
      <List.Item.Detail.Metadata.Label title="Last Check-Out" text={license.attributes.lastCheckOut?.toString() || "--"} />
      <List.Item.Detail.Metadata.Label title="Last Check-In" text={license.attributes.lastCheckIn?.toString() || "--"} />
      <List.Item.Detail.Metadata.Label title="Next Check-In" text={license.attributes.nextCheckIn?.toString() || "--"} />
      <List.Item.Detail.Metadata.TagList title="Permissions">
        {license.attributes.permissions.map(permission => <List.Item.Detail.Metadata.TagList.Item key={permission} text={permission} />)}
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label title="Relationships" />
    </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
      <OpenInKeygen route={`licenses/${license.id}`} />
      <Action.Push icon={Icon.Plus} title="New License" target={<NewLicense />} />
    </ActionPanel>} />)}
  </List>
}

function NewLicense() {
  const { isLoading, data: policies = [] } = useKeygen<Policy[]>("policies", { execute: false });

interface FormValues {
  name: string;
  key: string;
  expiry: Date | null;
  protected: boolean;
  policy: string;
}
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating License", values.name);

      const attributes: Partial<License["attributes"]> = {
        protected: values.protected
      }
      if (values.name) attributes.name = values.name;
      if (values.key) attributes.key = values.key;
      if (values.expiry) attributes.expiry = values.expiry.toString();
      const body = {
        data: {
          type: "licenses",
          attributes,
          relationships: {
            policy: {
              data: {
                type: "policies",
                id: values.policy
              }
            }
          }
        }
      }

      try {
        const response = await fetch(API_URL + "licenses", {
          method: "POST",
          headers,
          body: JSON.stringify(body)
        });
        await parseResponse(response);
        toast.style = Toast.Style.Success;
        toast.title = "Created License";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      protected: true
    },
    validation: {
      key(value) {
        if (value && value.length < 6) return "Key is too short (minimum is 6 characters)";
      },
      policy: FormValidation.Required
    }
  })
  return <Form isLoading={isLoading} actions={<ActionPanel>
    <Action.SubmitForm icon={Icon.Check} title="Submit" onSubmit={handleSubmit} />
  </ActionPanel>}>
    <Form.Description text="Attributes" />
    <Form.TextField title="Name" placeholder="Name" info="The name of the license. This can be used to distinguish licenses from each other." {...itemProps.name} />
    <Form.TextField title="Key" placeholder="Key" info="Key will be auto-generated if left blank" {...itemProps.key} />
    <Form.DatePicker title="Expiry" info="The time at which the license will expire (UTC timezone). When left blank, the expiration is calculated using the policy's duration." type={Form.DatePicker.Type.Date} {...itemProps.expiry} />
    <Form.Checkbox label="Protected" info="A protected license disallows users the ability to activate and manage their license's machines client-side. All machine management must be done server-side by an admin when protected." {...itemProps.protected} />
    {/* ermissioons */}
    <Form.Separator />

    {/* <Form.Description text="Metadata" /> */}

    <Form.Description text="Relationships" />
    <Form.Dropdown title="Policy" info="The policy to implement for the license." {...itemProps.policy}>
      {policies.map(policy => <Form.Dropdown.Item key={policy.id} title={`${policy.id.slice(0,8)} ${policy.attributes.name}`} value={policy.id} />)}
    </Form.Dropdown>
  </Form>
}