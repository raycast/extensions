import React, { useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import axios from "axios";

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

interface Preferences {
  apiKey: string;
}

interface AxiosErrorResponse {
  response?: {
    data?: { message?: string };
    status?: number;
  };
}

// Duration options in seconds
const DURATION_OPTIONS = [
  { label: "15 minutes", value: 900 },
  { label: "30 minutes", value: 1800 },
  { label: "45 minutes", value: 2700 },
  { label: "1 hour", value: 3600 },
  { label: "1.5 hours", value: 5400 },
  { label: "2 hours", value: 7200 },
];

// Type guard for Axios errors
function isAxiosError(error: unknown): error is AxiosErrorResponse {
  return typeof error === "object" && error !== null && "response" in error;
}

const ExtendSessionCommand: React.FC = () => {
  const [selectedDuration, setSelectedDuration] = useState("1800"); // Default to 30 minutes

  const extendSession = async () => {
    let preferences: Preferences;
    try {
      preferences = getPreferenceValues<Preferences>();
    } catch {
      await showToast({
        title: "API Key Missing",
        message: "Please set up your Rize.io API key in Raycast Preferences",
      });
      return;
    }

    if (!preferences.apiKey) {
      await showToast({
        title: "API Key Required",
        message: "Please set up your Rize.io API key in Raycast Preferences",
      });
      return;
    }

    try {
      // Find the selected duration option
      const durationOption = DURATION_OPTIONS.find(
        (option) => option.value.toString() === selectedDuration,
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
              length: durationOption.value,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${preferences.apiKey}`,
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
          title: "Session Extended",
          message: `Session extended by ${durationOption.label}`,
        });
      } else {
        throw new Error("Could not extend session");
      }
    } catch (error: unknown) {
      console.error("Full error details:", error);

      if (isAxiosError(error)) {
        console.error("Error response:", {
          data: error.response?.data,
          status: error.response?.status,
        });

        await showToast({
          title: "Extend Session Failed",
          message: `Error ${error.response?.status}: ${error.response?.data?.message || "Unable to extend session"}`,
        });
      } else if (error instanceof Error) {
        await showToast({
          title: "Extend Session Failed",
          message: error.message,
        });
      } else {
        await showToast({
          title: "Extend Session Failed",
          message: String(error),
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
      <Form.Dropdown
        id="duration"
        title="Extension Duration"
        value={selectedDuration}
        onChange={setSelectedDuration}
      >
        {DURATION_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value.toString()}
            title={option.label}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
};

export default ExtendSessionCommand;
