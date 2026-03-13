import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { deleteDomains } from "./utils/api";
import { FormValidation, getFavicon, useCachedState, useForm } from "@raycast/utils";
import ErrorComponent from "./components/ErrorComponent";

export default function Domains() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [cachedDomains, setCachedDomains] = useCachedState<string[]>("domains", []);

  async function confirmAndDelete(domain: string) {
    if (
      await confirmAlert({
        title: `Delete '${domain}'?`,
        message: "This will delete the domain from Mailwip Account (if it exists) as well as locally.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const updatedDomains = cachedDomains.filter((item) => item !== domain);
      setCachedDomains([...updatedDomains]);

      const response = await deleteDomains({ domains: [domain] });
      if (!("errors" in response)) {
        showToast(Toast.Style.Success, response.message);
      } else {
        push(<ErrorComponent error={response.errors} />);
      }
      setIsLoading(false);
    }
  }

  return (
    <List
      searchBarPlaceholder="Search domain"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Add New Local Domain" icon={Icon.PlusCircle} onAction={() => push(<AddLocalDomain />)} />
        </ActionPanel>
      }
    >
      <List.Section title={`${cachedDomains.length} ${cachedDomains.length === 1 ? "domain" : "domains"}`}>
        {!isLoading &&
          cachedDomains.map((domain) => (
            <List.Item
              key={domain}
              title={domain}
              icon={getFavicon(`https://${domain}`)}
              actions={
                <ActionPanel>
                  <Action
                    title="Delete Domain From Mailwip"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => confirmAndDelete(domain)}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Add New Local Domain"
                      icon={Icon.PlusCircle}
                      onAction={() => push(<AddLocalDomain />)}
                      shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}

function AddLocalDomain() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [cachedDomains, setCachedDomains] = useCachedState<string[]>("domains", []);

  const { handleSubmit, itemProps } = useForm<{ domain: string }>({
    async onSubmit(values) {
      setIsLoading(true);
      setCachedDomains([...cachedDomains, values.domain]);
      showToast(Toast.Style.Success, `${values.domain} added locally`);
      setIsLoading(false);
      pop();
    },
    validation: {
      domain: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add New Local Domain"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Domain" placeholder="example.com" {...itemProps.domain} />
      <Form.Description
        title="NOTE"
        text="This will NOT add the domain to your Mailwip Account - you will have to do that through the Mailwip Dashboard."
      />
    </Form>
  );
}
