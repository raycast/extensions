import { showToast, Toast, ActionPanel, Action, Form, popToRoot, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { createRoutingRule, getDomains } from "./utils/api";
import { CreateRoutingRequest, Domain, Response } from "./utils/types";
import { getFavicon } from "@raycast/utils";
import ErrorComponent from "./components/ErrorComponent";

interface State {
  domains?: Domain[];
  error?: string;
  isLoading: boolean;
  domainName: string;
  prefix: boolean;
  matchUser: string;
  targetAddresses: string;
  domainNameError?: string;
  prefixError?: string;
  matchUserError?: string;
  targetAddressesError?: string;
}

export default function CreateRoutingRule() {
  const [state, setState] = useState<State>({
    domains: undefined,
    error: "",
    isLoading: false,
    domainName: "",
    prefix: true,
    matchUser: "",
    targetAddresses: "",
    domainNameError: "",
    prefixError: "",
    matchUserError: "",
    targetAddressesError: "",
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

  const showError = async () => {
    if (state.error) {
      await showToast(Toast.Style.Failure, "Purelymail Error", state.error);
    }
  };

  const onDomainNameChange = (val: string) => {
    const error = val ? "" : state.domainNameError;
    setState((prevState: State) => {
      return { ...prevState, domainName: val, domainNameError: error };
    });
  };
  const onPrefixChange = (val: boolean) => {
    const error = val ? "" : state.prefixError;
    setState((prevState: State) => {
      return { ...prevState, prefix: val, prefixError: error };
    });
  };
  const onMatchUserChange = (val: string) => {
    const error = val ? "" : state.matchUserError;
    setState((prevState: State) => {
      return { ...prevState, matchUser: val, matchUserError: error };
    });
  };
  const onTargetAddressesChange = (val: string) => {
    const error = val ? "" : state.targetAddressesError;
    setState((prevState: State) => {
      return { ...prevState, targetAddresses: val, targetAddressesError: error };
    });
  };

  type Values = {
    domainName: string;
    prefix: boolean;
    matchUser: string;
    targetAddresses: string;
  };
  const handleSubmit = async (values: Values) => {
    const { domainName, prefix, matchUser, targetAddresses } = values;
    const domainError = !domainName ? "Domain is required" : "";
    const prefixError = prefix !== true && prefix !== false ? "Prefix is required" : "";
    const matchUserError = !matchUser ? "Match User is required" : "";
    const targetAddressesError = !targetAddresses ? "Target Addresses are required" : "";

    if (domainError || prefixError || matchUserError || targetAddressesError) {
      setState((prevState) => {
        return { ...prevState, domainError, prefixError, matchUserError, targetAddressesError };
      });
      showToast(Toast.Style.Failure, "Invalid input", "Please fill out all required fields");
      return;
    }

    setState((prevState: State) => {
      return { ...prevState, isLoading: true };
    });

    const formData: CreateRoutingRequest = {
      domainName,
      prefix,
      matchUser,
      targetAddresses: targetAddresses.split(","),
    };
    const response = await createRoutingRule(formData);
    switch (response.type) {
      case "error":
        setState((prevState) => {
          return { ...prevState, error: response.message, isLoading: false };
        });
        break;

      case "success":
        setState((prevState) => {
          return { ...prevState, error: "", isLoading: false };
        });
        await showToast(Toast.Style.Success, "Rule Created");
        await popToRoot({
          clearSearchBar: true,
        });
        break;

      default:
        setState((prevState) => {
          return { ...prevState, error: "", isLoading: false };
        });
        break;
    }
  };

  showError();

  const description = () => {
    let from = "FROM: ";
    const { domainName, prefix, matchUser, targetAddresses } = state;
    const targets = targetAddresses.toString().replaceAll(" ", "").replaceAll(",", " AND ");

    if (!prefix && matchUser) {
      from += `EXACT ADDRESS '${matchUser}@${domainName}'`;
    } else if (prefix && !matchUser) {
      from += `ANY ADDRESS i.e. '*@${domainName}'`;
    } else if (prefix && matchUser) {
      from += `ANY ADDRESS STARTING WITH '${matchUser}' i.e. '${matchUser}*@${domainName}'`;
    }
    const to = `

TO: '${targets}'`;
    return from + to;
  };

  return state.error ? (
    <ErrorComponent error={state.error} />
  ) : (
    <Form
      isLoading={state.domains === undefined || state.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Routing Rule"
            icon={Icon.Check}
            onSubmit={(values: Values) => handleSubmit(values)}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="domainName"
        title="Domain"
        placeholder="Select a domain"
        error={state.domainNameError}
        value={state.domainName}
        onChange={onDomainNameChange}
      >
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
        id="prefix"
        key="prefix"
        label="Prefix"
        info="Leave this unchecked for 'EXACT ADDRESS' matching"
        error={state.prefixError}
        value={state.prefix}
        onChange={onPrefixChange}
      />

      <Form.TextField
        id="matchUser"
        key="matchUser"
        title="Match User"
        placeholder="hi"
        info={`The local part of the user address to be matched, i.e. "user" in "user@domain.org"`}
        error={state.matchUserError}
        value={state.matchUser}
        onChange={onMatchUserChange}
      />

      <Form.TextField
        id="targetAddresses"
        key="targetAddresses"
        title="Target Addresses"
        placeholder="hi@example.local, webmaster@example.local"
        info={`List of full email addresses that this mail will be rerouted to`}
        error={state.targetAddressesError}
        value={state.targetAddresses}
        onChange={onTargetAddressesChange}
      />

      <Form.Description text={description()} />
    </Form>
  );
}
