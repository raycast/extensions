import React, { useState } from "react";
import { showFailureToast } from "@raycast/utils";
import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import axios from "axios";

// Existing interfaces remain the same

const ExtendSessionCommand: React.FC = () => {
  const [selectedDuration, setSelectedDuration] = useState(
    DURATION_OPTIONS[1].value.toString(),
  );

  const extendSession = React.useCallback(async () => {
    let preferences: Preferences;
    try {
      preferences = getPreferenceValues<Preferences>();
    } catch {
      await showFailureToast("API Key Missing", {
        message: "Please set up your Rize.io API key in Raycast Preferences",
      });
      return;
    }

    if (!preferences.apiKey) {
      await showFailureToast("API Key Required", {
        message: "Please set up your Rize.io API key in Raycast Preferences",
      });
      return;
    }

    try {
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

      await showFailureToast("Extend Session Failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [selectedDuration]);

  return React.createElement(
    Form,
    {
      actions: React.createElement(
        ActionPanel,
        {},
        React.createElement(Action, {
          title: "Extend Session",
          onAction: extendSession,
        }),
      ),
    },
    React.createElement(
      Form.Dropdown,
      {
        id: "duration",
        title: "Extension Duration",
        value: selectedDuration,
        onChange: setSelectedDuration,
      },
      DURATION_OPTIONS.map((option) =>
        React.createElement(Form.Dropdown.Item, {
          key: option.value,
          value: option.value.toString(),
          title: option.label,
        }),
      ),
    ),
  );
};

export default ExtendSessionCommand;
