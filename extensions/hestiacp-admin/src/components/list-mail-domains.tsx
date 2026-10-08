import { Action, ActionPanel, Color, Form, Icon, List, showToast, useNavigation } from "@raycast/api";
import { FormValidation, getFavicon, useForm } from "@raycast/utils";
import ListItemDetailComponent from "./ListItemDetailComponent";
import { getMailDomains } from "../utils/hestia";
import { useState } from "react";
import { AddMailDomainFormValues } from "../types/mail-domains";
import useHestia from "../utils/hooks/useHestia";

type ListMailDomainsComponentProps = {
  user: string;
};
export default function ListMailDomainsComponent({ user }: ListMailDomainsComponentProps) {
  const { isLoading, data: domains, revalidate } = getMailDomains(user);

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle={`Users / ${user} / Mail Domains`}>
      {domains &&
        Object.entries(domains).map(([domain, data]) => (
          <List.Item
            key={domain}
            title={domain}
            icon={getFavicon(`${data.SSL === "yes" ? "https" : "http"}://${domain}`, { fallback: Icon.Globe })}
            detail={<ListItemDetailComponent data={data} />}
            accessories={[
              { icon: { source: Icon.Dot, tintColor: data.SUSPENDED === "yes" ? Color.Red : Color.Green } },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy to Clipboard as JSON"
                  icon={Icon.Clipboard}
                  content={JSON.stringify(data)}
                />
              </ActionPanel>
            }
          />
        ))}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Add Mail Domain"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Mail Domain"
                  icon={Icon.Plus}
                  target={<AddMailDomain user={user} onMailDomainAdded={revalidate} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type AddMailDomainProps = {
  user: string;
  onMailDomainAdded: () => void;
};
function AddMailDomain({ user, onMailDomainAdded }: AddMailDomainProps) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);

  const { handleSubmit, itemProps, values } = useForm<AddMailDomainFormValues>({
    onSubmit() {
      setExecute(true);
    },
    validation: {
      domain: FormValidation.Required,
    },
  });

  const { isLoading: isAdding } = useHestia<Record<string, never>>("v-add-mail-domain", "Adding Mail Domain", {
    body: [user, values.domain],
    execute,
    async onData() {
      await showToast({
        title: "SUCCESS",
        message: `Added ${values.domain}`,
      });
      onMailDomainAdded();
      pop();
    },
    onError() {
      setExecute(false);
    },
  });

  return (
    <Form
      navigationTitle="Add Web Domain"
      isLoading={isAdding}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Domain" placeholder="domain.example" {...itemProps.domain} />
    </Form>
  );
}
