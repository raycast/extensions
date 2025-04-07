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

interface Preferences {
  apiKey: string;
}

export default function StopSessionCommand() {
  const stopSession = async () => {
    let preferences: Preferences;
    try {
      preferences = getPreferenceValues<Preferences>();
    } catch (_error) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const error = _error;
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Missing",
        message: "Please set up your Rize.io API key in Raycast Preferences",
      });
      return;
    }

    if (!preferences.apiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Required",
        message: "Please set up your Rize.io API key in Raycast Preferences",
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
        showFailureToast(error, { title: "Stop Session Failed" });
      } else {
        showFailureToast(error, { title: "Stop Session Failed" });
      }
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Stop Session" onAction={stopSession} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Stop Session"
        text="Click 'Stop Session' to end the current Rize.io session"
      />
    </Form>
  );
}
