import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import useNameSilo from "../hooks/useNameSilo";
import { ArrOrObjOrNull, type ConfigureEmailForward, EmailForward } from "../types";
import { parseAsArray } from "../utils/parseAsArray";
import { useState } from "react";
import { FormValidation, useForm } from "@raycast/utils";

export default function EmailForwards({ domain }: { domain: string }) {
  type EmailForwardsResponse = { addresses: ArrOrObjOrNull<EmailForward> };
  const { isLoading, data, revalidate } = useNameSilo<EmailForwardsResponse>("listEmailForwards", {
    domain,
  });
  const addresses = parseAsArray(data?.addresses);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search email forward">
      {!isLoading && !addresses.length ? (
        <List.EmptyView
          title="No email forwards in your domain"
          description="Configure email forwards to get started"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Configure Email Forward"
                target={<ConfigureEmailForward domain={domain} onConfigured={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Domains / ${domain} / Email Forwarders`}>
          {addresses.map((address) => (
            <List.Item
              key={address.email}
              icon={Icon.Envelope}
              title={address.email}
              subtitle={address.forwards_to}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Plus}
                    title="Configure Email Forward"
                    target={
                      <ConfigureEmailForward domain={domain} onConfigured={revalidate} initialForward={address} />
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ConfigureEmailForward({
  domain,
  onConfigured,
  initialForward,
}: {
  domain: string;
  onConfigured: () => void;
  initialForward?: EmailForward;
}) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);
  const { itemProps, handleSubmit, values } = useForm<ConfigureEmailForward>({
    onSubmit() {
      setExecute(true);
    },
    validation: {
      email: FormValidation.Required,
      forward1: FormValidation.Required,
    },
    initialValues: {
      email: initialForward?.email,
      forward1: initialForward?.forwards_to,
    },
  });

  const { isLoading } = useNameSilo<{ message: string }>(
    "configureEmailForward",
    {
      domain,
      ...values,
    },
    {
      execute,
      async onData(data) {
        await showToast(Toast.Style.Success, "Configured Email Forward", data.message);
        onConfigured();
        pop();
      },
      onError() {
        setExecute(false);
      },
    },
  );

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Configure Email Forward" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Domains / ${domain} / Email Forwards / Configure`} />
      <Form.TextField title="Email" placeholder="test" {...itemProps.email} />
      <Form.TextField title="Forward" placeholder="info@example.com" {...itemProps.forward1} />
    </Form>
  );
}
