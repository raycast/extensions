import { API_HEADERS, API_URL } from "./constants";
import { CountriesResponse, ErrorResponse } from "./types";
import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch, { FetchError } from "node-fetch";
import { showFailureToast, useCachedState } from "@raycast/utils";
import ErrorComponent from "./components/ErrorComponent";

export default function Countries() {
  const [isLoading, setIsLoading] = useState(false);
  const [countries, setCountries] = useCachedState<CountriesResponse>("countries");
  const [error, setError] = useState("");

  async function getCountries() {
    try {
      setIsLoading(true);
      await showToast({
        title: "Fetching Countries",
        style: Toast.Style.Animated,
      });
      const apiResponse = await fetch(API_URL + "countries", { headers: API_HEADERS });
      if (!apiResponse.ok) {
        const errorResponse = (await apiResponse.json()) as ErrorResponse;
        const { message } = errorResponse;
        await showFailureToast(message);
        setError(message);
      } else {
        const response = (await apiResponse.json()) as CountriesResponse;
        await showToast({
          title: "SUCCESS",
          style: Toast.Style.Success,
          message: `Fetched ${Object.keys(response).length} countries`,
        });
        setCountries(response);
      }
    } catch (error) {
      let message = "Something went wrong";
      if (error instanceof FetchError) {
        message = error.message;
      }
      await showFailureToast(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!countries) getCountries();
  }, []);

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <List isLoading={isLoading} searchBarPlaceholder="Search country">
      {countries &&
        Object.entries(countries).map(([countryCode, val]) => (
          <List.Item
            key={countryCode}
            title={`${val.country_name} | ${countryCode}`}
            subtitle={val.dialling_code}
            keywords={[val.dialling_code, val.dialling_code.substring(1)]}
            icon={{ source: `https://flagsapi.com/${countryCode}/flat/32.png`, fallback: Icon.Map }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Country Name to Clipboard"
                  content={val.country_name}
                  icon={Icon.Clipboard}
                />
                <Action.CopyToClipboard
                  title="Copy Country Code to Clipboard"
                  content={countryCode}
                  icon={Icon.Clipboard}
                />
                <Action.CopyToClipboard
                  title="Copy Dialling Code to Clipboard"
                  content={val.dialling_code}
                  icon={Icon.Clipboard}
                />
                <Action.CopyToClipboard
                  title="Copy All Countries as JSON to Clipboard"
                  content={JSON.stringify(countries)}
                  icon={Icon.Clipboard}
                />
                <ActionPanel.Section>
                  <Action title="Reload Countries" icon={Icon.Redo} onAction={() => getCountries()} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
