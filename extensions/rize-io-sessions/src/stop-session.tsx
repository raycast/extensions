import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import axios from "axios";

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
  data?: T;
  errors?: GraphQLError[];
}

export default async function Command() {
  try {
    // Retrieve preferences
    const preferences = getPreferenceValues<Preferences>();

    // Check current session
    const currentSessionResponse = await axios.post(
      "https://api.rize.io/api/v1/graphql",
      {
        query: `
          query {
            currentSession {
              id
              type
              title
            }
          }
        `,
      },
      {
        headers: {
          Authorization: `Bearer ${preferences.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 10000,
      },
    );

    // Check if there's an active session using optional chaining
    if (!currentSessionResponse.data?.data?.currentSession) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Active Session",
        message: "There is no active session to stop",
      });
      return;
    }

    // Stop the session
    const response = await axios.post<
      GraphQLResponse<{
        stopSessionTimer: {
          clientMutationId?: string;
          session?: Session;
        };
      }>
    >(
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
          Authorization: `Bearer ${preferences.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 10000,
      },
    );

    // Check for GraphQL errors using optional chaining
    if (response.data?.errors) {
      throw new Error(response.data.errors.map((e) => e.message).join(", "));
    }

    // Check the mutation result using optional chaining
    const mutationResult = response.data?.data?.stopSessionTimer;

    // If we have a session, show success with UserInitiated style
    if (mutationResult?.session) {
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
    console.error("Stop session error:", error);

    // Detailed error handling with UserInitiated style
    if (axios.isAxiosError(error)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Stop Session Failed",
        message:
          error.response?.data?.message ||
          error.message ||
          "Unable to stop session",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Stop Session Failed",
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
