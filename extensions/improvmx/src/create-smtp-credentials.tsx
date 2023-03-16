import {
  openExtensionPreferences,
  showToast,
  Detail,
  Toast,
  getPreferenceValues,
  ActionPanel,
  popToRoot,
  Clipboard,
  Action,
  Form,
  LocalStorage,
} from "@raycast/api";

import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { generatePassword, fetchAccont } from "./utils";

interface Preferences {
  api_token: string;
}

interface Domain {
  display: string;
  banned?: boolean;
  active?: boolean;
}

interface State {
  domains?: Domain[];
  error?: string;
  isLoading: boolean;
  username: string;
  password: string;
  onlyFromAlias: boolean;
  domainError: string;
  onlyFromAliasError: string;
  passwordError: string;
  usernameError: string;
  isRequireUpgrade: boolean;
  planName: string;
}

export default function createSMTPCredentials() {
  const [state, setState] = useState<State>({
      domains: undefined,
      error: "",
      isLoading: false,
      username: "",
      password: generatePassword(),
      onlyFromAlias: true,
      domainError: "",
      onlyFromAliasError: "",
      passwordError: "",
      usernameError: "",
      isRequireUpgrade: false,
      planName: "",
    }),
    API_TOKEN = getPreferenceValues<Preferences>().api_token,
    API_URL = "https://api.improvmx.com/v3/";

  const auth = Buffer.from("api:" + API_TOKEN).toString("base64");

  useEffect(() => {
    async function getPlanName() {
      await fetchAccont(auth, API_URL);
      const planName = (await LocalStorage.getItem("improvmx_plan")) as string;

      setState((prevState) => {
        return { ...prevState, planName: planName };
      });
    }

    async function getDomains() {
      try {
        const apiResponse = await fetch(API_URL + "domains?=", {
          headers: {
            Authorization: "Basic " + auth,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        if (!apiResponse.ok) {
          if (apiResponse.status === 401) {
            setState((prevState) => {
              return { ...prevState, error: "Invalid API Token", isLoading: false };
            });

            await showToast(Toast.Style.Failure, "ImprovMX Error", "Invalid API Token");
            return;
          }
        }

        const response = (await apiResponse.json()) as unknown;
        const domains = response as { domains: Array<Domain> };

        setState((prevState) => {
          return { ...prevState, domains: domains.domains, error: "" };
        });
      } catch (error) {
        setState((prevState) => {
          return {
            ...prevState,
            error:
              "There was an error with your request. Make sure you are connected to the internet. Please check that your API Token is correct and up-to-date. You can find your API Token in your [Improvmx Dashboard](https://improvmx.com/dashboard). If you need help, please contact support@improvmx.com",
            isLoading: false,
          };
        });

        await showToast(Toast.Style.Failure, "ImprovMX Error", "Failed to fetch domains. Please try again later.");

        return;
      }
    }

    getDomains();
    getPlanName();
  }, []);

  const handleSumbit = async (values: any) => {
    resetErrors();

    setState((prevState) => {
      return {
        ...prevState,
        isLoading: true,
      };
    });

    const { domain, username, password, onlyFromAlias } = values;

    const domainError = domain === undefined ? "Please select a domain" : "";
    const usernameError = username === "" ? "Please enter a username" : "";
    const passwordError = password?.length < 8 ? "Password must be at least 8 characters" : "";
    const onlyFromAliasError = onlyFromAlias === undefined ? "Please select an option" : "";

    if (domainError || usernameError || passwordError || onlyFromAliasError) {
      setState((prevState) => {
        return {
          ...prevState,
          domainError,
          usernameError,
          passwordError,
          onlyFromAliasError,
          isLoading: false,
        };
      });

      return;
    }

    const formData = {
      username: username,
      password: password,
      is_limited: onlyFromAlias,
    };

    try {
      const apiResponse = await fetch(API_URL + "domains/" + domain + "/credentials", {
        method: "POST",
        headers: {
          Authorization: "Basic " + auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!apiResponse.ok) {
        if (apiResponse.status === 401) {
          setState((prevState) => {
            return { ...prevState, error: "Invalid API Token" };
          });
          return;
        }

        const response = (await apiResponse.json()) as { error?: string; errors?: Record<string, string[]> };

        if (response.error) {
          setState((prevState) => {
            return { ...prevState, error: response.error, isLoading: false };
          });
        } else if (response.errors?.username) {
          if (response.errors?.username?.[0] === "You have reached the limit of account allowed for this domain.") {
            showToast(Toast.Style.Failure, "Limit Reached", response.errors?.username?.[0]);
            setState((prevState) => {
              return { ...prevState, isRequireUpgrade: true, isLoading: false };
            });
          } else {
            setState((prevState) => {
              return { ...prevState, usernameError: response.errors?.username?.[0] ?? "", isLoading: false };
            });
          }
        } else if (response.errors?.password) {
          setState((prevState) => {
            return { ...prevState, passwordError: response.errors?.password?.[0] ?? "", isLoading: false };
          });
        } else if (response.errors?.is_limited) {
          setState((prevState) => {
            return { ...prevState, onlyFromAliasError: response.errors?.is_limited?.[0] ?? "", isLoading: false };
          });
        } else {
          setState((prevState) => {
            return {
              ...prevState,
              error: "Failed to create SMTP credentials. Please try again later.",
              isLoading: false,
            };
          });
        }

        return;
      }

      await Clipboard.copy(password);
      await showToast(Toast.Style.Success, "SMTP Credentials Created", "Password copied to clipboard");
      await popToRoot({
        clearSearchBar: true,
      });
      setState((prevState) => {
        return {
          ...prevState,
          isLoading: false,
        };
      });
    } catch (error) {
      console.log(error);
    }
  };

  const upgradeAction = (
    <ActionPanel>
      <Action.OpenInBrowser url="https://app.improvmx.com/account/payment" title="Upgrade Account" />
    </ActionPanel>
  );

  const resetErrors = () => {
    setState((prevState) => {
      return {
        ...prevState,
        domainError: "",
        usernameError: "",
        passwordError: "",
        onlyFromAliasError: "",
      };
    });
  };

  const handleFormChange = (key: keyof State, value: any) => {
    resetErrors();
    setState((prevState) => {
      return { ...prevState, [key]: value };
    });
  };

  return state.planName === "" ? (
    <Detail isLoading={true}></Detail>
  ) : state.error ? (
    <Detail
      markdown={"⚠️" + state.error}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  ) : state.planName === "Free" ? (
    <Detail
      markdown={"⚠️ You are currently on a free plan. Please upgrade to create SMTP credentials."}
      actions={upgradeAction}
    />
  ) : state.planName && state.planName !== "Free" ? (
    <Form
      isLoading={state.domains === undefined || state.isLoading}
      actions={
        state.isRequireUpgrade ? (
          upgradeAction
        ) : (
          <ActionPanel>
            <Action.SubmitForm title="Create Alias" onSubmit={(values) => handleSumbit(values)} />
          </ActionPanel>
        )
      }
    >
      <Form.Dropdown id="domain" title="Domain" placeholder="Select a domain" error={state.domainError}>
        {state.domains
          ?.filter((domain) => !domain.banned && domain.active)
          .map((domain) => (
            <Form.Dropdown.Item key={domain.display} value={domain.display} title={domain.display} />
          ))}
      </Form.Dropdown>
      <Form.TextField
        id="username"
        title="Username"
        placeholder="Username"
        error={state.usernameError}
        value={state.username}
        onChange={(value) => {
          handleFormChange("username", value);
        }}
      />
      <Form.TextField
        id="password"
        title="Password"
        placeholder="Password"
        error={state.passwordError}
        value={state.password}
        onChange={(value) => {
          handleFormChange("password", value);
        }}
      />
      <Form.Dropdown
        id="onlyFromAlias"
        title="Send from any alias"
        placeholder="Select an option"
        value={state.onlyFromAlias ? "true" : "false"}
        onChange={(value) => {
          handleFormChange("onlyFromAlias", value === "true");
        }}
        error={state.onlyFromAliasError}
      >
        <Form.Dropdown.Item value="true" title="Only from this alias" />
        <Form.Dropdown.Item value="false" title="From any alias on that domain" />
      </Form.Dropdown>
    </Form>
  ) : null;
}
