import { useState, useEffect } from "react";
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

interface Preferences {
  apiKey: string;
}

// Utility function to format duration (may be used in future)
/* eslint-disable @typescript-eslint/no-unused-vars */
function formatDuration(seconds: number): string {
  if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);

    if (minutes === 0) {
      return hours === 1 ? "1 hour" : `${hours} hours`;
    } else {
      const hourPart = hours === 1 ? "1 hour" : `${hours} hours`;
      const minutePart = minutes === 1 ? "1 minute" : `${minutes} minutes`;
      return `${hourPart} ${minutePart}`.trim();
    }
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */

// Session type options with default durations
const SESSION_TYPES = [
  { label: "Focus", value: "focus", defaultLength: 1800 }, // 30 minutes
  { label: "Meeting", value: "meeting", defaultLength: 3600 }, // 1 hour
  { label: "Break", value: "break", defaultLength: 900 }, // 15 minutes
];

// Duration options in seconds
const DURATION_OPTIONS = [
  { label: "5 minutes", value: 300 },
  { label: "10 minutes", value: 600 },
  { label: "15 minutes", value: 900 },
  { label: "20 minutes", value: 1200 },
  { label: "25 minutes", value: 1500 },
  { label: "30 minutes", value: 1800 },
  { label: "45 minutes", value: 2700 },
  { label: "50 minutes", value: 3000 },
  { label: "1 hour", value: 3600 },
  { label: "1.5 hours", value: 5400 },
  { label: "2 hours", value: 7200 },
  { label: "2.5 hours", value: 9000 },
  { label: "3 hours", value: 10800 },
];

export default function StartSessionCommand() {
  const [selectedType, setSelectedType] = useState("focus");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<number>(1800); // Default to 30 minutes for focus

  // Update default duration when session type changes
  useEffect(() => {
    const selectedSessionType = SESSION_TYPES.find(
      (type) => type.value === selectedType,
    );
    if (selectedSessionType) {
      // If the current duration is not the default for this session type, keep the current duration
      const defaultLength = selectedSessionType.defaultLength;
      setDuration((prevDuration) =>
        DURATION_OPTIONS.some((option) => option.value === prevDuration)
          ? prevDuration
          : defaultLength,
      );
    }
  }, [selectedType]);

  const startSession = async () => {
    const preferences = getPreferenceValues<Preferences>();

    if (!preferences.apiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Required",
        message: "Please set up your Rize.io API key in Raycast Preferences",
      });
      return;
    }

    try {
      // Find the selected session type
      const sessionType = SESSION_TYPES.find(
        (type) => type.value === selectedType,
      );

      if (!sessionType) {
        throw new Error("Invalid session type");
      }

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
              type: selectedType,
              title: description || `${sessionType.label} Session`,
              length: duration, // Use selected duration
              intention: description || "",
              projectIds: [],
              clientIds: [],
              taskIds: [],
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
      const mutationResult = response.data.data.startSessionTimer;

      // If we have a session, show success
      if (mutationResult.session) {
        await showToast({
          style: Toast.Style.Success,
          title: "Session Started",
          message: `Started ${sessionType.label.toLowerCase()} session${description ? `: ${description}` : ""}`,
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

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Start Session" onAction={startSession} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="type"
        title="Session Type"
        value={selectedType}
        onChange={setSelectedType}
      >
        {SESSION_TYPES.map((type) => (
          <Form.Dropdown.Item
            key={type.value}
            value={type.value}
            title={type.label}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="duration"
        title="Session Duration"
        value={duration.toString()}
        onChange={(newDuration) => setDuration(Number(newDuration))}
      >
        {DURATION_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value.toString()}
            title={option.label}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="description"
        title="Session Description"
        placeholder="Optional: Add a description for your session"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}
