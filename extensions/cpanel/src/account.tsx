import { Action, ActionPanel, Color, Detail, Form, Icon, popToRoot, showToast } from "@raycast/api";
import { useGetAccountConfiguration, useGetResourceUsage, useUAPI } from "./lib/hooks";
import { isInvalidUrl } from "./lib/utils";
import InvalidUrl from "./lib/components/invalid-url";
import { useState } from "react";
import { FormValidation, useForm } from "@raycast/utils";

export default function Account() {
  if (isInvalidUrl()) return <InvalidUrl />;

  const { isLoading: isLoadingConfiguration, data: configuration } = useGetAccountConfiguration();
  const { isLoading: isLoadingUsage, data: usages = [] } = useGetResourceUsage();

  const isInfinity = (text: string | null) => !text || text === "0";

  const markdown = !usages.length
    ? undefined
    : `
## Statistics

${usages.map((usage) => `${usage.description}: ${usage.usage}/${isInfinity(usage.maximum) ? "∞" : usage.maximum}`).join(`\n\n`)}`;

  return (
    <Detail
      isLoading={isLoadingConfiguration || isLoadingUsage}
      markdown={markdown}
      metadata={
        configuration && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="UID" text={`${configuration.uid}`} />
            <Detail.Metadata.Label title="User" text={`${configuration.user}`} />
            <Detail.Metadata.Label title="Theme" text={configuration.theme} />
            <Detail.Metadata.Label title="Domain" text={configuration.domain} />
            <Detail.Metadata.Label title="IP" text={configuration.ip} />
            <Detail.Metadata.Link
              title="Contact Email"
              text={configuration.contact_email}
              target={`mailto:${configuration.contact_email}`}
            />
            <Detail.Metadata.Label
              title="DKIM Enabled"
              icon={configuration.dkim_enabled === "0" ? Icon.Xmark : Icon.Check}
            />
            <Detail.Metadata.Label
              title="SPF Enabled"
              icon={configuration.spf_enableds === "0" ? Icon.Xmark : Icon.Check}
            />
            <Detail.Metadata.TagList title="Features">
              {Object.entries(configuration.feature).map(([key, val]) => (
                <Detail.Metadata.TagList.Item key={key} text={key} color={val === "1" ? Color.Green : Color.Red} />
              ))}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {configuration && (
            <Action.Push
              icon={Icon.Pencil}
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Update cPanel Account Password"
              target={<UpdatePassword username={configuration.user} />}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function UpdatePassword({ username }: { username: string }) {
  const [execute, setExecute] = useState(false);
  type FormValues = {
    newpass: string;
    oldpass: string;
    enablemysql: boolean;
  };

  const { itemProps, handleSubmit, values } = useForm<FormValues>({
    onSubmit() {
      setExecute(true);
    },
    initialValues: {
      enablemysql: false,
    },
    validation: {
      oldpass: FormValidation.Required,
      newpass: FormValidation.Required,
    },
  });

  const { isLoading } = useUAPI<string>(
    "UserManager",
    "change_password",
    { ...values, enablemysql: +values.enablemysql },
    {
      execute,
      onError() {
        setExecute(false);
      },
      async onData(data) {
        await showToast({
          title: data,
        });
        await popToRoot();
      },
    },
  );

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Update" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Username" text={username} />
      <Form.PasswordField title="Old Password" placeholder="hunter2" {...itemProps.oldpass} />
      <Form.PasswordField title="New Password" placeholder="correct-horse-battery-staple" {...itemProps.newpass} />
      <Form.Checkbox label="Also update the cPanel account's MySQL password" {...itemProps.enablemysql} />
    </Form>
  );
}
