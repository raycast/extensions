import dayjs from "dayjs";
import relatimeTime from "dayjs/plugin/relativeTime";
import { API_URL, headers, MAX_PAGE_SIZE, parseResponse, useKeygenPaginated } from "./keygen";
import { License, LicenseStatus, Policy } from "./interfaces";
import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import OpenInKeygen from "./open-in-keygen";
import { FormValidation, useForm } from "@raycast/utils";
import { LICENSE_STATUS_COLOR } from "./config";
dayjs.extend(relatimeTime);

export default function Licenses() {
  const { isLoading, data: licenses, pagination, revalidate, error } = useKeygenPaginated<License>("licenses");

  return (
    <List isLoading={isLoading} isShowingDetail pagination={pagination}>
      {!isLoading && !licenses.length && !error ? (
        <List.EmptyView
          description="No results"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="New License" target={<NewLicense onNew={revalidate} />} />
            </ActionPanel>
          }
        />
      ) : (
        licenses.map((license) => (
          <List.Item
            key={license.id}
            icon={{
              value: { source: Icon.Dot, tintColor: LICENSE_STATUS_COLOR[license.attributes.status] },
              tooltip: license.attributes.status,
            }}
            title={license.id.slice(0, 8)}
            subtitle={license.attributes.name || undefined}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Resource" />
                    <List.Item.Detail.Metadata.Label title="ID" text={license.id} />
                    <List.Item.Detail.Metadata.Label
                      title="Created"
                      text={dayjs(license.attributes.created).fromNow()}
                    />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title="Attributes" />
                    <List.Item.Detail.Metadata.Label title="Name" text={license.attributes.name || "--"} />
                    <List.Item.Detail.Metadata.Label title="Key" text={license.attributes.key} />
                    <List.Item.Detail.Metadata.Label
                      title="Expiry"
                      text={`${license.attributes.expiry} (${dayjs(license.attributes.expiry).fromNow()})`}
                    />
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={license.attributes.status}
                        color={LICENSE_STATUS_COLOR[license.attributes.status]}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label
                      title="Machines"
                      text={`${license.relationships.machines.meta.count} of ${license.attributes.maxMachines ?? "unlimited"}`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="CPU Cores"
                      text={`${license.relationships.machines.meta.cores} of ${license.attributes.maxCores ?? "unlimited"}`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Users"
                      text={`${license.relationships.users.meta.count} of ${license.attributes.maxUsers ?? "unlimited"}`}
                    />
                    <List.Item.Detail.Metadata.TagList title="Protected">
                      <List.Item.Detail.Metadata.TagList.Item text={`${license.attributes.protected}`} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="Scheme" text={license.attributes.scheme || "---"} />
                    <List.Item.Detail.Metadata.TagList title="Suspended">
                      <List.Item.Detail.Metadata.TagList.Item text={`${license.attributes.suspended}`} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label
                      title="Last Validation"
                      text={license.attributes.lastValidated?.toString() || "--"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Valid"
                      icon={
                        license.attributes.status === LicenseStatus.ACTIVE
                          ? Icon.Check
                          : license.attributes.status === LicenseStatus.EXPIRED
                            ? Icon.Xmark
                            : Icon.QuestionMark
                      }
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Last Check-Out"
                      text={license.attributes.lastCheckOut?.toString() || "--"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Last Check-In"
                      text={license.attributes.lastCheckIn?.toString() || "--"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Next Check-In"
                      text={license.attributes.nextCheckIn?.toString() || "--"}
                    />
                    <List.Item.Detail.Metadata.TagList title="Permissions">
                      {license.attributes.permissions.map((permission) => (
                        <List.Item.Detail.Metadata.TagList.Item key={permission} text={permission} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title="Relationships" />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <OpenInKeygen route={`licenses/${license.id}`} />
                <Action.Push icon={Icon.Plus} title="New License" target={<NewLicense onNew={revalidate} />} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function NewLicense({ onNew }: { onNew: () => void }) {
  const { pop } = useNavigation();
  const { isLoading, data: policies = [] } = useKeygenPaginated<Policy>("policies", { pageSize: MAX_PAGE_SIZE });

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
        protected: values.protected,
        ...(values.name && { name: values.name }),
        ...(values.key && { key: values.key }),
        ...(values.expiry && { expiry: values.expiry.toString() }),
      };

      const body = {
        data: {
          type: "licenses",
          attributes,
          relationships: {
            policy: {
              data: {
                type: "policies",
                id: values.policy,
              },
            },
          },
        },
      };

      try {
        const response = await fetch(API_URL + "licenses", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        await parseResponse(response);
        toast.style = Toast.Style.Success;
        toast.title = "Created License";
        onNew();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      protected: true,
    },
    validation: {
      key(value) {
        if (value && value.length < 6) return "Key is too short (minimum is 6 characters)";
      },
      policy: FormValidation.Required,
    },
  });
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
      <Form.TextField
        title="Name"
        placeholder="Name"
        info="The name of the license. This can be used to distinguish licenses from each other."
        {...itemProps.name}
      />
      <Form.TextField
        title="Key"
        placeholder="Key"
        info="Key will be auto-generated if left blank"
        {...itemProps.key}
      />
      <Form.DatePicker
        title="Expiry"
        info="The time at which the license will expire (UTC timezone). When left blank, the expiration is calculated using the policy's duration."
        type={Form.DatePicker.Type.Date}
        {...itemProps.expiry}
      />
      <Form.Checkbox
        label="Protected"
        info="A protected license disallows users the ability to activate and manage their license's machines client-side. All machine management must be done server-side by an admin when protected."
        {...itemProps.protected}
      />
      <Form.Separator />

      <Form.Description text="Relationships" />
      <Form.Dropdown title="Policy" info="The policy to implement for the license." {...itemProps.policy}>
        {policies.map((policy) => (
          <Form.Dropdown.Item
            key={policy.id}
            title={`${policy.id.slice(0, 8)} ${policy.attributes.name}`}
            value={policy.id}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
