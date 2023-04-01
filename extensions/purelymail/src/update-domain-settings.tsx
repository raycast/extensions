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
import { useForm, FormValidation, getFavicon } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getDomains, updateDomainSettings } from "./utils/api";
import { Domain, Response, UpdateDomainSettingsRequest } from "./utils/types";

interface State {
  domains?: Domain[];
  error?: string;
  forwardingEmail?: string;
  domainError?: string;
  isLoading: boolean;

  allowAccountReset: boolean;
  symbolicSubaddressing: boolean;
  recheckDns: boolean;
}

interface DomainArgs {
  domain: string;
}

export default function UpdateDomainSettings(props: LaunchProps<{ arguments: DomainArgs }>) {
  const propDomain = props.arguments.domain;

  const [state, setState] = useState<State>({
    domains: undefined,
    error: "",
    forwardingEmail: "",
    domainError: "",
    isLoading: false,

    allowAccountReset: false,
    symbolicSubaddressing: false,
    recheckDns: false,
  });

  useEffect(() => {
    async function getFromApi() {
      const response: Response = await getDomains();

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

  const { handleSubmit, itemProps, setValue } = useForm<UpdateDomainSettingsRequest>({
    async onSubmit(values) {
      setState((prevState: State) => {
        return { ...prevState, isLoading: true };
      });

      const response = await updateDomainSettings({ ...values });
      switch (response.type) {
        case "error":
          await showToast(Toast.Style.Failure, "Purelymail Error", response.message);
          setState((prevState) => {
            return { ...prevState, isLoading: false };
          });
          return;

        case "success":
          setState((prevState) => {
            return { ...prevState, isLoading: false };
          });
          await showToast(Toast.Style.Success, "Domain Settings Updated", "DOMAIN: " + values.name);
          await popToRoot({
            clearSearchBar: true,
          });
          break;

        default:
          setState((prevState: State) => {
            return { ...prevState, isLoading: false };
          });
          break;
      }
    },
    validation: {
      name: FormValidation.Required,
    },
    initialValues: {
      name: state.domains?.length ? propDomain : undefined,
    },
  });

  const showError = async () => {
    if (state.error) {
      await showToast(Toast.Style.Failure, "Purelymail Error", state.error);
    }
  };

  const handleDomainChange = (newDomain: string) => {
    setValue("allowAccountReset", state.domains?.find((d) => d.name === newDomain)?.allowAccountReset || false);
    setValue("symbolicSubaddressing", state.domains?.find((d) => d.name === newDomain)?.symbolicSubaddressing || false);
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
          <Action.SubmitForm title="Update Domain Settings" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Domain" placeholder="Select a domain" {...itemProps.name} onChange={handleDomainChange}>
        {state.domains?.map((domain) => (
          <Form.Dropdown.Item
            key={domain.name}
            value={domain.name}
            title={domain.name}
            icon={getFavicon(`https://${domain.name}`)}
          />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        label="Allow Account Reset"
        info={`If your account allows password reset, then only domains with this option enabled can be used for password reset. In essence, owning domains with this option enabled is equivalent to owning the account.`}
        {...itemProps.allowAccountReset}
      />
      <Form.Checkbox
        label="Symbolic Subaddressing"
        info={`If enabled, everything after a symbol character in an email address will be ignored`}
        {...itemProps.symbolicSubaddressing}
      />
      <Form.Checkbox label="Recheck DNS" {...itemProps.recheckDns} />
    </Form>
  );
}
