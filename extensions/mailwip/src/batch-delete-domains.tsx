import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { DOMAINS } from "./utils/constants";
import { deleteDomains } from "./utils/api";
import { FormValidation, getFavicon, useForm } from "@raycast/utils";
import { DomainDelete } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";

export default function Domains() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<DomainDelete>({
    async onSubmit(values) {
      const { domains } = values;
      if (
        await confirmAlert({
          title: `Delete '${domains.join()}'?`,
          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
        })
      ) {
        setIsLoading(true);
        const response = await deleteDomains({ domains });
        if (!("errors" in response)) {
          showToast(Toast.Style.Success, response.message);
          if (
            await confirmAlert({
              title: response.message,
              message: "Go to Extension Preferences to remove domain?",
              primaryAction: { title: "Yes" },
            })
          )
            openExtensionPreferences();
        } else {
          push(<ErrorComponent error={response.errors} />);
        }
        setIsLoading(false);
      }
    },
    validation: {
      domains: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="Go To API Reference"
            icon={Icon.Globe}
            url="https://mailwip.com/api/?javascript#batch-delete-domains"
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Batch Delete Domains (you will have to manually remove these from Extension Preferences)" />
      <Form.Separator />
      <Form.TagPicker title="Domains" {...itemProps.domains}>
        {DOMAINS &&
          DOMAINS.replaceAll(" ", "")
            .split(",")
            .map((domain) => (
              <Form.TagPicker.Item title={domain} value={domain} key={domain} icon={getFavicon(`https://${domain}`)} />
            ))}
      </Form.TagPicker>
    </Form>
  );
}
