import { useState, useEffect } from "react";
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import axios from "axios";
import { getApiKey } from "./api-key";

// Interfaces for type safety
interface Session {
  id?: string;
  type: string;
  title?: string;
  startTime?: string;
  description?: string;
}

interface GraphQLError {
  message: string;
  path?: string[];
}

interface GraphQLResponse<T> {
  data: T;
  errors?: GraphQLError[];
}

const DURATION_OPTIONS = [
  { label: "5 minutes", value: "5m", seconds: 300 },
  { label: "10 minutes", value: "10m", seconds: 600 },
  { label: "15 minutes", value: "15m", seconds: 900 },
  { label: "20 minutes", value: "20m", seconds: 1200 },
  { label: "30 minutes", value: "30m", seconds: 1800 },
  { label: "1 hour", value: "1h", seconds: 3600 },
  { label: "1.5 hours", value: "1.5h", seconds: 5400 },
  { label: "2 hours", value: "2h", seconds: 7200 },
];

export default function ExtendSessionCommand() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState("5m");

  useEffect(() => {
    async function fetchApiKey() {
      try {
        const storedApiKey = await getApiKey();

        if (!storedApiKey) {
          await showToast({
            style: Toast.Style.Failure,
            title: "API Key Missing",
            message: "Please set up your Rize.io API key in extension settings",
          });
        }

        setApiKey(storedApiKey);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error Retrieving API Key",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    fetchApiKey();
  }, []);

  const extendSession = async () => {
    if (!apiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Required",
        message: "Please set up your Rize.io API key first",
      });
      return;
    }

    try {
      // Find the selected duration option
      const durationOption = DURATION_OPTIONS.find(
        (option) => option.value === selectedDuration,
      );

      if (!durationOption) {
        throw new Error("Invalid duration selected");
      }

      interface ExtendSessionResponse {
        extendCurrentSession: {
          clientMutationId?: string;
          session?: Session;
        };
      }

      const response = await axios.post<GraphQLResponse<ExtendSessionResponse>>(
        "https://api.rize.io/api/v1/graphql",
        {
          query: `
            mutation ExtendCurrentSession($input: ExtendCurrentSessionInput!) {
              extendCurrentSession(input: $input) {
                clientMutationId
                session {
                  id
                  type
                  title
                }
              }
            }
          `,
          variables: {
            input: {
              clientMutationId: "extend-session-raycast",
              length: durationOption.seconds,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      );

      // Check for GraphQL errors
      if (response.data.errors) {
        throw new Error(response.data.errors.map((e) => e.message).join(", "));
      }

      // Check the mutation result
      const mutationResult = response.data.data.extendCurrentSession;

      // If we have a session, show success
      if (mutationResult.session) {
        await showToast({
          style: Toast.Style.Success,
          title: "Session Extended",
          message: `Session extended by ${durationOption.label}`,
        });
      } else {
        throw new Error("Could not extend session");
      }
    } catch (error) {
      console.error("Full error details:", error);

      if (axios.isAxiosError(error)) {
        console.error("Error response:", {
          data: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers,
        });

        await showToast({
          style: Toast.Style.Failure,
          title: "Extend Session Failed",
          message: `Error ${error.response?.status}: ${error.response?.data?.message || "Unable to extend session"}`,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Extend Session Failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Extend Session" onAction={extendSession} />
        </ActionPanel>
      }
    >
      {!apiKey && (
        <Form.Description
          title="API Key"
          text="Please set up your Rize.io API key in extension settings"
        />
      )}
      <Form.Dropdown
        id="duration"
        title="Extension Duration"
        value={selectedDuration}
        onChange={setSelectedDuration}
      >
        {DURATION_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.label}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
