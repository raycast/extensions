import { ActionPanel, Action, Form, showToast, Toast, Clipboard, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { generateEmail, getAvailableDomains } from "../api";
import { saveEmail } from "../storage";
import { GenerateEmailOptions } from "../types";
import { TOAST_MESSAGES, ERROR_MESSAGES, UI_STRINGS } from "../constants";

export function CustomizeEmailForm() {
  const [domains, setDomains] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { pop } = useNavigation();

  useEffect(() => {
    async function fetchDomains() {
      try {
        const availableDomains = await getAvailableDomains();
        setDomains(availableDomains);
      } catch (error) {
        console.error(error);
        await showToast({
          style: Toast.Style.Failure,
          title: ERROR_MESSAGES.DOMAINS_FETCH_FAILED,
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchDomains();
  }, []);

  async function handleSubmit(values: { customAddress: string; customPassword: string; customDomain?: string }) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: TOAST_MESSAGES.GENERATING,
    });

    try {
      const options: GenerateEmailOptions = {};

      if (values.customAddress) {
        options.customAddress = values.customAddress;
      }

      if (values.customPassword) {
        options.customPassword = values.customPassword;
      }

      if (values.customDomain) {
        options.customDomain = values.customDomain;
      }

      const email = await generateEmail(options);
      await saveEmail(email);

      toast.style = Toast.Style.Success;
      toast.title = TOAST_MESSAGES.DONE;
      toast.message = email.address;

      await Clipboard.copy(email.address);
      pop();
    } catch (error) {
      console.error(error);
      toast.style = Toast.Style.Failure;
      toast.title = ERROR_MESSAGES.EMAIL_GENERATE_FAILED;
      toast.message = error instanceof Error ? error.message : ERROR_MESSAGES.STANDARD_ERROR_MESSAGE;
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Email" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={UI_STRINGS.CUSTOMIZE_FORM_DESCRIPTION} />
      <Form.TextField
        id="customAddress"
        title={UI_STRINGS.EMAIL_ADDRESS_LABEL}
        placeholder={UI_STRINGS.EMAIL_ADDRESS_PLACEHOLDER}
        info={UI_STRINGS.EMAIL_ADDRESS_HELPER}
      />
      {domains.length > 1 ? (
        <Form.Dropdown id="customDomain" title={UI_STRINGS.DOMAIN_LABEL} defaultValue={domains[0]}>
          {domains.map((domain) => (
            <Form.Dropdown.Item key={domain} value={domain} title={domain} />
          ))}
        </Form.Dropdown>
      ) : domains.length === 1 ? (
        <Form.Description text={`${UI_STRINGS.DOMAIN_PREFIX}${domains[0]}`} />
      ) : null}
      <Form.PasswordField
        id="customPassword"
        title={UI_STRINGS.PASSWORD_LABEL}
        placeholder={UI_STRINGS.PASSWORD_PLACEHOLDER}
        info={UI_STRINGS.PASSWORD_HELPER}
      />
    </Form>
  );
}
