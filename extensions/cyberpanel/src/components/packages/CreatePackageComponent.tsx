import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { createPackage } from "../../utils/api";
import { CreatePackageFormValues } from "../../types/packages";

type CreatePackageProps = {
  onPackageCreated: () => void;
};
export default function CreatePackage({ onPackageCreated }: CreatePackageProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreatePackageFormValues>({
    async onSubmit(values) {
      const response = await createPackage({
        ...values,
        api: values.api ? "1" : "0",
        allowFullDomain: values.allowFullDomain ? "1" : "0",
      });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Created ${values.packageName} successfully`);
        onPackageCreated();
        pop();
      }
    },
    validation: {
      packageName: FormValidation.Required,
      diskSpace(value) {
        if (!value) return "The item is required";
        else if (!Number(value) && value !== "0") return "The item must be a number";
      },
      bandwidth(value) {
        if (!value) return "The item is required";
        else if (!Number(value) && value !== "0") return "The item must be a number";
      },
      dataBases(value) {
        if (!value) return "The item is required";
        else if (!Number(value) && value !== "0") return "The item must be a number";
      },
      ftpAccounts(value) {
        if (!value) return "The item is required";
        else if (!Number(value) && value !== "0") return "The item must be a number";
      },
      emails(value) {
        if (!value) return "The item is required";
        else if (!Number(value) && value !== "0") return "The item must be a number";
      },
      allowedDomains(value) {
        if (!value) return "The item is required";
        else if (!Number(value) && value !== "0") return "The item must be a number";
      },
    },
  });
  return (
    <Form
      navigationTitle="Create Package"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Package Name" placeholder="SingleWebsite" {...itemProps.packageName} />
      <Form.TextField title="Disk Space (MB)" placeholder="0 = Unlimited" {...itemProps.diskSpace} />
      <Form.TextField title="Bandwidth (MB)" placeholder="0 = Unlimited" {...itemProps.bandwidth} />
      <Form.TextField title="Databases" placeholder="1" {...itemProps.dataBases} />
      <Form.TextField title="FTP Accounts" placeholder="1" {...itemProps.ftpAccounts} />
      <Form.TextField title="Email Accounts" placeholder="1" {...itemProps.emails} />
      <Form.TextField title="Allowed Domains" placeholder="0 = Unlimited" {...itemProps.allowedDomains} />
      <Form.Checkbox label="API Access" {...itemProps.api} />
      <Form.Checkbox label="Allow Full Domain" {...itemProps.allowFullDomain} />
    </Form>
  );
}
