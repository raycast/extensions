import { useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
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

// Duration options in seconds
const DURATION_OPTIONS = [
  { label: "15 minutes", value: 900 },
  { label: "30 minutes", value: 1800 },
  { label: "45 minutes", value: 2700 },
  { label: "1 hour", value: 3600 },
  { label: "1.5 hours", value: 5400 },
  { label: "2 hours", value: 7200 },
];

export default function ExtendSessionCommand() {
  const [selectedDuration, setSelectedDuration] = useState("1800"); // Default to 30 minutes

  const extendSession = async () => {
    const preferences = getPreferenceValues<Preferences>();

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
}
