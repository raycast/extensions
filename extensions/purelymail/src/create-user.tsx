import { showToast, Toast, ActionPanel, Action, Form, LaunchProps, Icon, popToRoot } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { createUser } from "./utils/api";
import { CreateUserRequest } from "./utils/types";
import { getFavicon } from "@raycast/utils";
import ErrorComponent from "./components/ErrorComponent";
import { useDomains } from "./utils/hooks";

interface DomainArgs {
  domain: string;
}

export default function CreateUser(props: LaunchProps<{ arguments: DomainArgs }>) {
  const propDomain = props.arguments.domain;
  const { isLoading: isLoadingDomains, data: domains, error } = useDomains({ includeShared: true });

  const [isLoading, setIsLoading] = useState(true);

  const { handleSubmit, itemProps } = useForm<CreateUserRequest & { confirmPassword: string }>({
    async onSubmit(values) {
      setIsLoading(true);

      const filledFields = Object.entries(values).filter(([, val]) => val !== "");
      const mapped = Object.fromEntries(filledFields);

      const { userName, domainName, password } = values;
      const formData = {
        userName,
        domainName,
        password,
        ...mapped,
      };

      const response = await createUser(formData);
      if (response.type === "success") {
        await showToast(Toast.Style.Success, "User Created", `USER: ${userName}@${domainName}`);
        popToRoot();
      }
      setIsLoading(false);
    },
    validation: {
      userName: FormValidation.Required,
      domainName: FormValidation.Required,
      password(value) {
        if (!value) return "The item is required";
        if (itemProps.confirmPassword.value && itemProps.confirmPassword.value !== value)
          return "Passwords do not match";
      },
      confirmPassword(value) {
        if (!value) return "The item is required";
        if (itemProps.password.value !== value) return "Passwords do not match";
      },
    },
    initialValues: {
      domainName: propDomain || undefined,
      enablePasswordReset: true,
      enableSearchIndexing: true,
      sendWelcomeEmail: true,
    },
  });

  return error ? (
    <ErrorComponent error={error.message} />
  ) : (
    <Form
      isLoading={isLoading || isLoadingDomains}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create User" onSubmit={handleSubmit} icon={Icon.AddPerson} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Domain" placeholder="Select a domain" {...itemProps.domainName}>
        {domains?.map((domain) => (
          <Form.Dropdown.Item
            key={domain.name}
            value={domain.name}
            title={domain.name}
            icon={getFavicon(`https://${domain.name}`)}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField title="Username" placeholder="Enter a username" {...itemProps.userName} />
      <Form.Description text={`${itemProps.userName.value || "<USER>"}@${itemProps.domainName.value}`} />

      <Form.PasswordField title="Password" placeholder="Enter password" {...itemProps.password} />
      <Form.PasswordField title="Confirm Password" placeholder="Confirm password" {...itemProps.confirmPassword} />

      <Form.Separator />
      <Form.TextField title="Recovery Email" placeholder="Enter Recovery Email" {...itemProps.recoveryEmail} />
      <Form.TextField
        title="Recovery Email Description"
        placeholder="Recovery Email Description"
        {...itemProps.recoveryEmailDescription}
      />
      <Form.TextField title="Recovery Phone" placeholder="Enter Recovery Phone" {...itemProps.recoveryPhone} />
      <Form.TextField
        title="Recovery Phone Description"
        placeholder="Recovery Phone Description"
        {...itemProps.recoveryPhoneDescription}
      />
      <Form.Checkbox
        label="Enable Password Reset"
        info="If you lose the password to your account and password reset is enabled, then you can reset the password using one of your recovery methods."
        {...itemProps.enablePasswordReset}
      />
      <Form.Checkbox
        label="Enable Search Indexing"
        info="If disabled, inbox search functionality will be limited and some space will be saved."
        {...itemProps.enableSearchIndexing}
      />
      <Form.Checkbox label="Send Welcome Email" {...itemProps.sendWelcomeEmail} />
    </Form>
  );
}
