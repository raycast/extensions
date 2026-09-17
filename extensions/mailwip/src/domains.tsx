import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Keyboard,
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
        icon: getFavicon(`https://${domain}`, { fallback: Icon.Trash }),
        title: `Delete '${domain}'?`,
        message: "This will delete the domain from Mailwip Account (if it exists) as well as locally.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        setIsLoading(true);
        const toast = await showToast(Toast.Style.Animated, "Deleting domain", domain);
        const result = await deleteDomains({ domains: [domain] });
        const updatedDomains = cachedDomains.filter((item) => item !== domain);
        setCachedDomains([...updatedDomains]);
        toast.style = Toast.Style.Success;
        toast.title = result.message;
      } catch (error) {
        push(<ErrorComponent error={String(error)} />);
      } finally {
        setIsLoading(false);
      }
    }
  }

  return (
    <List
      searchBarPlaceholder="Search domain"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add New Local Domain"
            icon={Icon.PlusCircle}
            target={<AddLocalDomain />}
            shortcut={Keyboard.Shortcut.Common.New}
          />
        </ActionPanel>
      }
    >
      <List.Section title={`${cachedDomains.length} ${cachedDomains.length === 1 ? "domain" : "domains"}`}>
        {cachedDomains.map((domain) => (
          <List.Item
            key={domain}
            title={domain}
            icon={getFavicon(`https://${domain}`)}
            actions={
              <ActionPanel>
                <Action
                  title="Delete Domain from Mailwip"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => confirmAndDelete(domain)}
                />
                <ActionPanel.Section>
                  <Action.Push
                    title="Add New Local Domain"
                    icon={Icon.PlusCircle}
                    target={<AddLocalDomain />}
                    shortcut={Keyboard.Shortcut.Common.New}
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
  const [, setCachedDomains] = useCachedState<string[]>("domains", []);

  const { handleSubmit, itemProps } = useForm<{ domain: string }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding domain locally", values.domain);
      setIsLoading(true);
      setCachedDomains((prev) => [...prev, values.domain]);
      toast.style = Toast.Style.Success;
      toast.title = "Domain added locally";
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
