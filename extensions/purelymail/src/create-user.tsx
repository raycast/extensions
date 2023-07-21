import {
  openExtensionPreferences,
  showToast,
  Detail,
  Toast,
  ActionPanel,
  Action,
  Form,
  LaunchProps,
  popToRoot,
  Icon,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useEffect, useState } from "react";
import { createUser, getDomains } from "./utils/api";
import { CreateUserRequest, Domain, Response } from "./utils/types";
import { getFavicon } from "@raycast/utils";

interface State {
  domains?: Domain[];
  error?: string;
  forwardingEmail?: string;
  domainError?: string;
  isLoading: boolean;
}

interface DomainArgs {
  domain: string;
}

export default function CreateUser(props: LaunchProps<{ arguments: DomainArgs }>) {
  const propDomain = props.arguments.domain;

  const [state, setState] = useState<State>({
    domains: undefined,
    error: "",
    forwardingEmail: "",
    domainError: "",
    isLoading: false,
  });

  useEffect(() => {
    async function getFromApi() {
      const response: Response = await getDomains(true);

      switch (response.type) {
        case "error":
          setState((prevState) => {
            return { ...prevState, error: response.message, isLoading: false };
          });
          break;

        case "success":
          setState((prevState) => {
            return { ...prevState, error: "", domains: response.result.domains };
          });
          break;

        default:
          break;
      }
    }

    getFromApi();
  }, []);

  const { handleSubmit, itemProps } = useForm<CreateUserRequest>({
    async onSubmit(values) {
      setState((prevState: State) => {
        return { ...prevState, isLoading: true };
      });

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
      switch (response.type) {
        case "error":
          await showToast(Toast.Style.Failure, "Purelymail Error", response.message);
          setState((prevState) => {
            return { ...prevState, isLoading: false };
          });
          break;

        case "success":
          setState((prevState) => {
            return { ...prevState, isLoading: false };
          });
          await showToast(Toast.Style.Success, "User Created", `USER: ${userName}@${domainName}`);
          await popToRoot({
            clearSearchBar: true,
          });
          break;

        default:
          setState((prevState) => {
            return { ...prevState, isLoading: false };
          });
          break;
      }
    },
    validation: {
      userName: FormValidation.Required,
      domainName: FormValidation.Required,
      password: FormValidation.Required,
    },
    initialValues: {
      domainName: propDomain || undefined,
      enablePasswordReset: true,
      enableSearchIndexing: true,
      sendWelcomeEmail: true,
    },
  });

  const showError = async () => {
    if (state.error) {
      await showToast(Toast.Style.Failure, "Purelymail Error", state.error);
    }
  };

  showError();

  return state.error ? (
    <Detail
      markdown={"⚠️" + state.error}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  ) : (
    <Form
      isLoading={state.domains === undefined || state.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create User" onSubmit={handleSubmit} icon={Icon.AddPerson} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Domain" placeholder="Select a domain" {...itemProps.domainName}>
        {state.domains?.map((domain) => (
          <Form.Dropdown.Item
            key={domain.name}
            value={domain.name}
            title={domain.name}
            icon={getFavicon(`https://${domain.name}`)}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField title="Username" placeholder="Enter a username" {...itemProps.userName} />

      <Form.PasswordField title="Password" placeholder="Enter password" {...itemProps.password} />

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
