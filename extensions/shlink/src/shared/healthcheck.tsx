import { Action, ActionPanel, Detail, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect } from "react";

interface Props {
  children: JSX.Element;
  onLoading?: (value: boolean) => void;
  renderWhileLoading?: boolean;
}

export function HealthCheck({ renderWhileLoading, onLoading, children }: Props) {
  const pref = getPreferenceValues<Preferences>();

  const { isLoading, data, error } = useFetch(`${pref.shlinkUrl}/rest/health`, {
    method: "GET",
    headers: {
      "X-Api-Key": pref.shlinkApiKey,
    },
    keepPreviousData: true,
    async parseResponse(response) {
      return response.ok;
    },
    initialData: true,
  });

  useEffect(() => {
    onLoading?.(isLoading);
  });

  if (!data || error) {
    return (
      <Detail
        markdown={
          "## Oops, Something wrong!\nPlease, check your extension preferences. Maybe the Shlink URL is wrong or service is dead?"
        }
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }
  if (!isLoading || renderWhileLoading) {
    return children;
  }
  return <Detail isLoading={isLoading} />;
}
