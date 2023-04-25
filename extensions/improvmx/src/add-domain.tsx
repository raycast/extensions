import {
  ActionPanel,
  Form,
  Action,
  Toast,
  getPreferenceValues,
  popToRoot,
  showToast,
  LaunchProps,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";

import { useState } from "react";
import fetch from "node-fetch";

interface Preferences {
  api_token: string;
}

interface State {
  domain?: string;
  isValid?: boolean;
  isLoading?: boolean;
  error: string;
  isRequireUpgrade: boolean;
}

export default function AddDomain() {
  const [state, setState] = useState<State>({
    domain: undefined,
    isValid: false,
    isLoading: false,
    error: "",
    isRequireUpgrade: false,
  });

  const [domain, setDomain] = useState("");
  const [isValid, setIsValid] = useState(true);

  const API_TOKEN = getPreferenceValues<Preferences>().api_token;

  const API_URL = "https://api.improvmx.com/v3/";

  const auth = Buffer.from("api:" + API_TOKEN).toString("base64");
  const DOMAIN_REGEX = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;

  const handleDomainChange = (newDomain: string) => {
    if (newDomain.length > 0) {
      setIsValid(DOMAIN_REGEX.test(newDomain));
      setDomain(newDomain);
    }
  };

  const handleSubmit = async () => {
    if (isValid) {
      setState((prevState) => {
        return { ...prevState, isLoading: true };
      });

      try {
        const apiResponse = await fetch(API_URL + "domains", {
          method: "POST",
          headers: {
            Authorization: "Basic " + auth,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            domain: domain,
          }),
        });

        if (!apiResponse.ok) {
          if (apiResponse.status === 401) {
            setState((prevState) => {
              return { ...prevState, error: "Invalid API Token", isLoading: false };
            });

            await showToast(Toast.Style.Failure, "ImprovMX Error", "Invalid API Token");
            setDomain("");
            setTimeout(() => {
              popToRoot({ clearSearchBar: true });
            }, 2000);
            return;
          }

          const apiErrors = (await apiResponse.json()) as { error?: string; errors?: Record<string, string[]> };
          if (apiErrors.errors) {
            const errorToShow = Object.values(apiErrors.errors).flat();

            await showToast(Toast.Style.Failure, "ImprovMX Error", errorToShow[0]);

            if (errorToShow[0].startsWith("Your account is limited to")) {
              setState((prevState) => {
                return { ...prevState, isRequireUpgrade: true, isLoading: false };
              });
            }

            await showToast(Toast.Style.Failure, "ImprovMX Error", errorToShow[0]);
            setDomain("");
            setState((prevState) => {
              return { ...prevState, isLoading: false, error: errorToShow[0] };
            });
          }
          return;
        }
      } catch (err) {
        setState((prevState) => {
          return {
            ...prevState,
            error:
              "There was an error with your request. Make sure you are connected to the internet. Please check that your API Token is correct and up-to-date. You can find your API Token in your Improvmx Dashboard at https://improvmx.com/dashboard. If you need help, please contact support@improvmx.com.",
            isLoading: false,
          };
        });
        await showToast(Toast.Style.Failure, "ImprovMX Error", "Failed to add domain. Please try again later.");
        return;
      }

      setState((prevState) => {
        return { ...prevState, isLoading: false };
      });
      await showToast(Toast.Style.Success, "Domain Added", "Domain added successfully to your ImprovMX account.");
      setDomain("");
      popToRoot({ clearSearchBar: true });
    }
  };

  const upgradeAction = (
    <ActionPanel>
      <Action.OpenInBrowser url="https://app.improvmx.com/account/payment" title="Upgrade ImprovMX Account" />
    </ActionPanel>
  );

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
      isLoading={state.isLoading}
      actions={
        state.isRequireUpgrade ? (
          upgradeAction
        ) : (
          <ActionPanel>
            <Action
              title="Submit"
              onAction={() => {
                handleSubmit();
              }}
            />
          </ActionPanel>
        )
      }
    >
      <Form.TextField
        id="domain"
        autoFocus
        info="Enter a domain to add to your ImprovMX account."
        error={isValid ? undefined : "Invalid domain"}
        title="Domain"
        placeholder="example.com"
        value={domain}
        onChange={handleDomainChange}
      />
    </Form>
  );
}
