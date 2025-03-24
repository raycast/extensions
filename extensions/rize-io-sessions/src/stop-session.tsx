// src/stop-session.tsx
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
  endTime?: string;
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

export default function StopSessionCommand() {
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

  const stopSession = async () => {
    if (!apiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Required",
        message: "Please set up your Rize.io API key first",
      });
      return;
    }

    try {
      interface StopSessionResponse {
        stopSessionTimer: {
          clientMutationId?: string;
          session?: Session;
        };
      }

      const response = await axios.post<GraphQLResponse<StopSessionResponse>>(
        "https://api.rize.io/api/v1/graphql",
        {
          query: `
            mutation StopSessionTimer($input: StopSessionTimerInput!) {
              stopSessionTimer(input: $input) {
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
              clientMutationId: "stop-session-raycast",
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
      const mutationResult = response.data.data.stopSessionTimer;

      // If we have a session, show success
      if (mutationResult.session) {
        await showToast({
          style: Toast.Style.Success,
          title: "Session Stopped",
          message: mutationResult.session.title
            ? `Stopped session: ${mutationResult.session.title}`
            : "Your Rize.io session has ended",
        });
      } else {
        throw new Error("Could not stop session");
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
          title: "Stop Session Failed",
          message: `Error ${error.response?.status}: ${error.response?.data?.message || "Unable to stop session"}`,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Stop Session Failed",
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
          <Action title="Stop Session" onAction={stopSession} />
        </ActionPanel>
      }
    >
      {!apiKey && (
        <Form.Description
          title="API Key"
          text="Please set up your Rize.io API key in extension settings"
        />
      )}
      <Form.Description
        title="Stop Session"
        text="Click 'Stop Session' to end the current Rize.io session"
      />
    </Form>
  );
}
