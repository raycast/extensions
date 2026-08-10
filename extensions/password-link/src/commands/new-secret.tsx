import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  Clipboard,
  useNavigation,
  LaunchProps,
  LaunchType,
} from "@raycast/api";
import { useState } from "react";
import { apiClient } from "../lib/api-client";
import { prepareSecretData } from "../lib/encryption";
import { validateConfig } from "../lib/config";
import { generateSecretUrl, dateToHoursFromNow } from "../lib/utils";
import { NewSecretArguments } from "../types";
import { showFailureToast } from "@raycast/utils";

interface FormValues {
  secret: string;
  description: string;
  message: string;
  expiration: Date | null;
  viewButton: boolean;
  captcha: boolean;
  password: string;
  maxViews: string;
}

/**
 * New Secret Command
 * Creates a new encrypted secret via password.link API
 */
export default function NewSecret(
  props: LaunchProps<{ arguments: NewSecretArguments }> = {
    launchType: LaunchType.UserInitiated,
    arguments: {} as NewSecretArguments,
  },
) {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize form with arguments if provided
  const [formValues, setFormValues] = useState<FormValues>({
    secret: props?.arguments?.secret || "",
    description: "",
    message: props?.arguments?.message || "",
    expiration: null,
    viewButton: true,
    captcha: false,
    password: "",
    maxViews: "1",
  });

  /**
   * Validate form values
   * @param values - Form values to validate
   * @returns true if valid, false otherwise
   */
  const validateForm = (values: FormValues): boolean => {
    const errors: Record<string, string> = {};

    if (!validateConfig()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Configuration Error",
        message: "Please configure your API keys in preferences",
      });
      return false;
    }

    if (!values.secret.trim()) {
      errors.secret = "Secret content is required";
    }

    if (!values.message.trim()) {
      errors.message = "Message is required";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return false;
    }

    // Clear any existing errors if validation passes
    setValidationErrors({});
    return true;
  };

  /**
   * Parse numeric form values
   * @param value - String value to parse
   * @returns Parsed number or undefined
   */
  const parseNumericValue = (value: string): number | undefined => {
    return value ? parseInt(value, 10) : undefined;
  };

  /**
   * Handle successful secret creation
   * @param secretId - Created secret ID
   * @param publicPart - Public password part
   */
  const handleSecretCreated = async (secretId: string, publicPart: string) => {
    const secretUrl = generateSecretUrl(secretId, publicPart);

    await Clipboard.copy(secretUrl);
    await showToast({
      style: Toast.Style.Success,
      title: "Secret Created",
      message: "Secret URL copied to clipboard",
    });

    // Navigate to success page instead of opening browser
    import("../components/SecretSuccessPage").then(({ default: SecretSuccessPage }) => {
      push(
        <SecretSuccessPage
          secretUrl={secretUrl}
          secretId={secretId}
          onBack={() => {
            // Go back to list of secrets
            import("./list-secrets").then(({ default: ListSecrets }) => {
              push(<ListSecrets />);
            });
          }}
        />,
      );
    });
  };

  /**
   * Handle form submission
   */
  async function handleSubmit() {
    if (!validateForm(formValues)) {
      return;
    }

    setIsLoading(true);

    try {
      const { ciphertext, password_part_private, publicPart } = prepareSecretData(formValues.secret);

      // Auto-populate description with message if description is empty
      const description = formValues.description.trim() || formValues.message.trim();

      // Convert date to hours if expiration is set
      const expirationHours = formValues.expiration ? dateToHoursFromNow(formValues.expiration) : undefined;

      const response = await apiClient.createSecret({
        ciphertext,
        password_part_private,
        description: description,
        message: formValues.message.trim(),
        expiration: expirationHours,
        view_button: formValues.viewButton,
        captcha: formValues.captcha,
        password: formValues.password || undefined,
        max_views: parseNumericValue(formValues.maxViews) || 1,
      });

      await handleSecretCreated(response.data.id, publicPart);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to create secret" });
    } finally {
      setIsLoading(false);
    }
  }

  // Set minimum date to 1 hour from now
  const getMinDate = () => {
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 1);
    return minDate;
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Secret"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Describe the secret (internal only)"
        value={formValues.description}
        onChange={(description) => setFormValues({ ...formValues, description })}
        error={validationErrors?.description}
      />

      <Form.TextField
        id="message"
        title="Message"
        placeholder="Message to show to the recipient"
        value={formValues.message}
        onChange={(message) => setFormValues({ ...formValues, message })}
        error={validationErrors?.message}
      />

      <Form.TextArea
        id="secret"
        title="Secret Content"
        placeholder="Enter the secret content to encrypt..."
        value={formValues.secret}
        onChange={(secret) => setFormValues({ ...formValues, secret })}
        error={validationErrors?.secret}
      />

      <Form.DatePicker
        id="expiration"
        title="Expiration"
        info="When the secret should expire (minimum 1 hour from now, optional)"
        value={formValues.expiration}
        onChange={(expiration) => setFormValues({ ...formValues, expiration })}
        min={getMinDate()}
      />

      <Form.Checkbox
        id="viewButton"
        title="View Button"
        label="Show view button instead of auto-display"
        value={formValues.viewButton}
        onChange={(viewButton) => setFormValues({ ...formValues, viewButton })}
      />

      <Form.Checkbox
        id="captcha"
        title="CAPTCHA"
        label="Require CAPTCHA before viewing"
        value={formValues.captcha}
        onChange={(captcha) => setFormValues({ ...formValues, captcha })}
      />

      <Form.TextField
        id="password"
        title="Password Protection"
        placeholder="Password for the secret"
        value={formValues.password}
        onChange={(password) => setFormValues({ ...formValues, password })}
      />

      <Form.TextField
        id="maxViews"
        title="Max Views"
        placeholder="1"
        value={formValues.maxViews}
        onChange={(maxViews) => setFormValues({ ...formValues, maxViews })}
        info="Maximum number of times the secret can be viewed"
      />
    </Form>
  );
}
