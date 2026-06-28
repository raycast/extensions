import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { modifyPackage } from "../../utils/api";
import { ModifyPackageFormValues, Package } from "../../types/packages";

type ModifyPackageProps = {
  package: Package;
  onPackageModified: () => void;
};
export default function ModifyPackage({ package: packageItem, onPackageModified }: ModifyPackageProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ModifyPackageFormValues>({
    async onSubmit(values) {
      const formattedValues = {
        diskSpace: Number(values.diskSpace),
        bandwidth: Number(values.bandwidth),
        dataBases: Number(values.dataBases),
        ftpAccounts: Number(values.ftpAccounts),
        emails: Number(values.emails),
        allowedDomains: Number(values.allowedDomains),
        api: Number(values.api),
        allowFullDomain: Number(values.allowFullDomain),
      };
      const response = await modifyPackage({ ...formattedValues, packageName: packageItem.packageName });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Modified ${packageItem.packageName} successfully`);
        onPackageModified();
        pop();
      }
    },
    initialValues: {
      diskSpace: packageItem.diskSpace.toString(),
      bandwidth: packageItem.bandwidth.toString(),
      dataBases: packageItem.dataBases.toString(),
      ftpAccounts: packageItem.ftpAccounts.toString(),
      emails: packageItem.emailAccounts.toString(),
      allowedDomains: packageItem.allowedDomains.toString(),
    },
    validation: {
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
      navigationTitle={`Modify ${packageItem.packageName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
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
