// src/start-session.tsx
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

// Session type options
const SESSION_TYPES = [
  { label: "Focus", value: "focus" },
  { label: "Meeting", value: "meeting" },
  { label: "Break", value: "break" },
];

export default function StartSessionCommand() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        setIsLoading(false);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error Retrieving API Key",
          message: error instanceof Error ? error.message : String(error),
        });
        setIsLoading(false);
      }
    }

    fetchApiKey();
  }, []);

  const startSession = async (values: {
    description: string;
    type: string;
  }) => {
    if (!apiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Required",
        message: "Please set up your Rize.io API key first",
      });
      return;
    }

    try {
      interface StartSessionResponse {
        startSessionTimer: {
          clientMutationId?: string;
          session?: Session;
        };
      }

      const response = await axios.post<GraphQLResponse<StartSessionResponse>>(
        "https://api.rize.io/api/v1/graphql",
        {
          query: `
            mutation StartSessionTimer($input: StartSessionTimerInput!) {
              startSessionTimer(input: $input) {
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
              clientMutationId: "start-session-raycast",
              type: values.type,
              title:
                values.description ||
                `${values.type.charAt(0).toUpperCase() + values.type.slice(1)} Session`,
              length: 0,
              intention: "",
              projectIds: [],
              clientIds: [],
              taskIds: [],
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
      const mutationResult = response.data.data.startSessionTimer;

      // If we have a session, show success
      if (mutationResult.session) {
        await showToast({
          style: Toast.Style.Success,
          title: "Session Started",
          message:
            mutationResult.session.title || "Your Rize.io session has begun",
        });
      } else {
        throw new Error("No session was created");
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
          title: "Start Session Failed",
          message: `Error ${error.response?.status}: ${error.response?.data?.message || "Unable to start session"}`,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Start Session Failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Session" onSubmit={startSession} />
        </ActionPanel>
      }
    >
      {!apiKey && (
        <Form.Description
          title="API Key"
          text="Please set up your Rize.io API key in extension settings"
        />
      )}
      <Form.Dropdown id="type" title="Session Type" defaultValue="focus">
        {SESSION_TYPES.map((type) => (
          <Form.Dropdown.Item
            key={type.value}
            value={type.value}
            title={type.label}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="description"
        title="Session Description"
        placeholder="Optional: Add a description for your session"
      />
    </Form>
  );
}
