import { Form, ActionPanel, Action, showToast, getPreferenceValues, Toast, useNavigation } from "@raycast/api";
import { useFetch, showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { useSources, Preferences, Source, API_BASE_URL, API_KEY_ERROR_MESSAGE } from "./api";

type FormValues = {
  source: string;
  branch: string;
  message: string;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  const { data: sourcesData, isLoading: isLoadingSources, selectedSource, setSelectedSource } = useSources();

  const { data: sourceDetails, isLoading: isLoadingSourceDetails } = useFetch<Source>(
    `${API_BASE_URL}/${selectedSource}`,
    {
      headers: {
        "X-Goog-Api-Key": preferences.julesApiKey,
      },
      execute: !!selectedSource,
      onError: (error) => {
        showFailureToast(error, {
          title: "Failed to fetch source details",
          message: API_KEY_ERROR_MESSAGE,
        });
      },
    },
  );

  async function handleSubmit(values: FormValues) {
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating session..." });

    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": preferences.julesApiKey,
        },
        body: JSON.stringify({
          prompt: values.message,
          sourceContext: {
            source: values.source,
            githubRepoContext: {
              startingBranch: values.branch,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create session: ${response.statusText} - ${errorText}`);
      }

      const jsonResponse = await response.json();

      // Runtime validation to ensure safety
      if (!jsonResponse || typeof (jsonResponse as { name?: unknown }).name !== "string") {
        throw new Error("Invalid API response: 'name' property is missing or not a string.");
      }

      const result = jsonResponse as { name: string };
      console.log("Session created:", result);

      toast.style = Toast.Style.Success;
      toast.title = "Session created successfully";
      toast.message = `Session ${result.name} created`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create session";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsLoading(false);
    }
  }

  const branches = sourceDetails?.githubRepo?.branches || [];
  const defaultBranch = sourceDetails?.githubRepo?.defaultBranch?.displayName;

  return (
    <Form
      isLoading={isLoading || isLoadingSources || isLoadingSourceDetails}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="source" title="Source" value={selectedSource} onChange={setSelectedSource}>
        {sourcesData?.sources?.map((source) => (
          <Form.Dropdown.Item
            key={source.name}
            value={source.name}
            title={`${source.githubRepo.owner}/${source.githubRepo.repo}`}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="branch" title="Branch" defaultValue={defaultBranch} key={selectedSource}>
        {branches.map((branch) => (
          <Form.Dropdown.Item key={branch.displayName} value={branch.displayName} title={branch.displayName} />
        ))}
      </Form.Dropdown>

      <Form.TextArea id="message" title="Message" placeholder="Enter your chat message..." />
    </Form>
  );
}
