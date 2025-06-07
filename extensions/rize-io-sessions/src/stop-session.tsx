import React, { useEffect } from "react";
import { getPreferenceValues, showToast } from "@raycast/api";
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

interface Preferences {
  apiKey: string;
}

const StopSessionCommand: React.FC = () => {
  useEffect(() => {
    const runStopSession = async () => {
      try {
        // Retrieve preferences
        const preferences = getPreferenceValues<Preferences>();

        // Validate API key
        if (!preferences.apiKey) {
          await showToast({
            title: "API Key Required",
            message:
              "Please set up your Rize.io API key in Raycast Preferences",
          });
          return;
        }

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
          throw new Error(
            response.data.errors.map((e) => e.message).join(", "),
          );
        }

        // Check the mutation result using optional chaining
        const mutationResult = response.data?.data?.stopSessionTimer;

        // If we have a session, show success
        if (mutationResult?.session) {
          await showToast({
            title: "Session Stopped",
            message: mutationResult.session.title
              ? `Stopped session: ${mutationResult.session.title}`
              : "Your Rize.io session has ended",
          });
        } else {
          throw new Error("Could not stop session");
        }
      } catch (error: unknown) {
        showFailureToast(error, { title: "Stop Session Failed" });

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        await showToast({
          title: "Stop Session Failed",
          message: errorMessage,
        });
      }
    };

    runStopSession();
  }, []);

  return null;
};

export default StopSessionCommand;
