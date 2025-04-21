import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { useEffect } from "react";

interface Preferences {
  apiToken: string;
}

interface FormValues {
  fullName: string;
  relationshipStrength: string;
  email?: string;
  phone?: string;
  birthday?: string;
}

const RELATIONSHIP_STRENGTHS = [
  "family",
  "intimate-friends",
  "close-friends",
  "casual-friends",
  "acquaintances",
  "business-contacts",
  "almost-strangers",
] as const;

const generateSourceId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
};

const parseBirthday = (dateStr: string): string | undefined => {
  if (!dateStr) return undefined;

  // Try parsing ISO format first (YYYY-MM-DD)
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate.toISOString().split("T")[0];
  }

  // Try parsing "DD of MM" or "DD MM" format
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const datePattern =
    /^(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-zA-Z]+)(?:\s+(\d{4}))?$/i;
  const match = dateStr.match(datePattern);

  if (match) {
    const day = parseInt(match[1], 10);
    const monthStr = match[2].toLowerCase();
    const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
    const month = monthNames.indexOf(monthStr);

    if (month !== -1 && day >= 1 && day <= 31) {
      const date = new Date(year, month, day);
      return date.toISOString().split("T")[0];
    }
  }

  // Try DD/MM/YYYY or DD-MM-YYYY format
  const altPattern = /^(\d{1,2})[-/](\d{1,2})(?:[-/](\d{4}))?$/;
  const altMatch = dateStr.match(altPattern);

  if (altMatch) {
    const day = parseInt(altMatch[1], 10);
    const month = parseInt(altMatch[2], 10) - 1;
    const year = altMatch[3]
      ? parseInt(altMatch[3], 10)
      : new Date().getFullYear();

    if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
      const date = new Date(year, month, day);
      return date.toISOString().split("T")[0];
    }
  }

  return undefined;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    if (!preferences.apiToken) {
      showToast({
        style: Toast.Style.Failure,
        title: "API Token Required",
        message:
          "Please set your Lunatask API token in the extension preferences",
      });
    }
  }, [preferences.apiToken]);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      relationshipStrength: "casual-friends",
    },
    onSubmit: async (values) => {
      if (!preferences.apiToken) {
        await showToast({
          style: Toast.Style.Failure,
          title: "API Token Required",
          message:
            "Please set your Lunatask API token in the extension preferences",
        });
        return;
      }

      if (!values.fullName) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Name Required",
          message: "Please enter a name for the relationship",
        });
        return;
      }

      const nameParts = values.fullName.trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

      try {
        const requestBody = {
          first_name: firstName,
          last_name: lastName && lastName.trim() !== "" ? lastName : null,
          relationship_strength:
            values.relationshipStrength || "casual-friends",
          source: "raycast",
          source_id: generateSourceId(),
          birthday: values.birthday ? parseBirthday(values.birthday) : null,
        };

        if (values.email?.trim()) {
          Object.assign(requestBody, { email: values.email.trim() });
        }

        if (values.phone?.trim()) {
          Object.assign(requestBody, { phone: values.phone.trim() });
        }

        const response = await fetch("https://api.lunatask.app/v1/people", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${preferences.apiToken}`,
          },
          body: JSON.stringify(requestBody),
        });

        const responseData = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Invalid API token. Please check your token in the extension preferences."
            );
          }
          if (response.status === 402) {
            throw new Error(
              "You've reached the free plan limit. Please upgrade to add more relationships."
            );
          }
          throw new Error(
            `Failed to create relationship: ${JSON.stringify(responseData)}`
          );
        }

        await showToast({
          style: Toast.Style.Success,
          title: "Relationship created successfully",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to create relationship",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    },
  });

  return (
    <Form
      actions={
        // @ts-expect-error Raycast API component type errors
        <ActionPanel>
          <Action.SubmitForm title="Add Relationship" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Full Name"
        placeholder="Enter full name (first name and last name)"
        {...itemProps.fullName}
      />
      <Form.Dropdown
        title="Relationship Strength"
        {...itemProps.relationshipStrength}
      >
        {RELATIONSHIP_STRENGTHS.map((strength) => (
          <Form.Dropdown.Item
            key={strength}
            value={strength}
            title={strength
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Email"
        placeholder="Enter email address (optional)"
        {...itemProps.email}
      />
      <Form.TextField
        title="Phone"
        placeholder="Enter phone number (optional)"
        {...itemProps.phone}
      />
      <Form.TextField
        title="Birthday"
        placeholder="Enter birthday (e.g., 15th of April, 15/04, or 2024-04-15)"
        {...itemProps.birthday}
      />
    </Form>
  );
}
