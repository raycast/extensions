import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { createChildDomain, createWebsite, listPackages, listUsers } from "../../utils/api";
import { CreateWebsiteFormValues } from "../../types/websites";
import { useEffect, useState } from "react";
import { ListPackagsResponse, Package } from "../../types/packages";
import { ListUsersResponse, User } from "../../types/users";
import { AVAILABLE_PHP_VERSIONS_FOR_WEBSITES } from "../../utils/constants";

type CreateWebsiteProps = {
  masterDomain?: string;
  onWebsiteCreated: () => void;
};
export default function CreateWebsite({ masterDomain, onWebsiteCreated }: CreateWebsiteProps) {
  const { pop } = useNavigation();

  const [packages, setPackages] = useState<Package[]>();
  const [users, setUsers] = useState<User[]>();

  async function fetchPackages() {
    const response = await listPackages();
    if (response.error_message === "None") {
      const successResponse = response as ListPackagsResponse;
      const packagesData =
        typeof successResponse.data === "string" ? JSON.parse(successResponse.data) : successResponse.data;

      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${packagesData.length} packages`);
      setPackages(packagesData);
    }
  }
  async function fetchUsers() {
    const response = await listUsers();
    if (response.error_message === "None") {
      const successResponse = response as ListUsersResponse;
      const usersData =
        typeof successResponse.data === "string" ? JSON.parse(successResponse.data) : successResponse.data;

      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${usersData.length} users`);
      setUsers(usersData);
    }
  }
  useEffect(() => {
    fetchPackages();
    fetchUsers();
  }, []);

  const { handleSubmit, itemProps } = useForm<CreateWebsiteFormValues>({
    async onSubmit(values) {
      const ssl = values.ssl ? 1 : 0;
      const dkimCheck = values.dkimCheck ? 1 : 0;
      const openBasedir = values.openBasedir ? 1 : 0;

      let response;
      if (!masterDomain) {
        response = await createWebsite({ ...values, ssl, dkimCheck, openBasedir });
      } else {
        const path = "path" in values ? (values.path as string) : "";
        response = await createChildDomain({ ...values, ssl, dkimCheck, openBasedir, masterDomain, path });
      }
      // const response = await createWebsite({ ...values, ssl, dkimCheck, openBasedir });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Created Website '${values.domainName}' successfully`);
        onWebsiteCreated();
        pop();
      }
    },
    validation: {
      domainName: FormValidation.Required,
      package: FormValidation.Required,
      adminEmail: FormValidation.Required,
      phpSelection: FormValidation.Required,
      websiteOwner: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle={!masterDomain ? "Create Website" : "Create Child Domain"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Domain Name" placeholder="example.local" {...itemProps.domainName} />
      <Form.Dropdown title="Package" {...itemProps.package}>
        {packages?.map((item) => (
          <Form.Dropdown.Item key={item.packageName} title={item.packageName} value={item.packageName} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Admin Email" placeholder="admin@example.local" {...itemProps.adminEmail} />
      <Form.Dropdown title="PHP Version" {...itemProps.phpSelection}>
        {AVAILABLE_PHP_VERSIONS_FOR_WEBSITES.map((version) => (
          <Form.Dropdown.Item key={version} title={version} value={version} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Website Owner" {...itemProps.websiteOwner}>
        {users?.map((user) => <Form.Dropdown.Item key={user.id} title={user.userName} value={user.userName} />)}
      </Form.Dropdown>
      {masterDomain && (
        <Form.TextField
          id="path"
          title="Path"
          placeholder={`Leave empty to use default: ${itemProps.domainName.value || ""}`}
        />
      )}
      <Form.Checkbox label="SSL" {...itemProps.ssl} />
      <Form.Checkbox label="DKIM Support" {...itemProps.dkimCheck} />
      <Form.Checkbox label="open_basedir Protection" {...itemProps.openBasedir} />
    </Form>
  );
}
