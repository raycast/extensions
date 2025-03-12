import React from "react";

import { Form, ActionPanel, Action, showToast, Toast, useNavigation, open } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

/**
 * URL to the privacy policy of Caschys Blog
 */
const PRIVACY_POLICY_URL = "https://stadt-bremerhaven.de/datenschutzerklaerung/";

/**
 * Interface for the tip submission form values
 */
interface TipFormValues {
  tipTitle: string;
  tipContent: string;
  name: string;
  consent: boolean;
}

/**
 * Submit Tip Command
 *
 * This component provides a form for users to submit tips to Caschys Blog.
 * It includes:
 * - Form validation for required fields
 * - Privacy policy consent checkbox
 * - Email client integration for sending tips
 * - Error handling for the submission process
 *
 * @returns {JSX.Element} The Submit Tip form view
 */
export default function SubmitTip() {
  const { pop } = useNavigation();

  /**
   * Form handling with validation
   * Uses the useForm hook from @raycast/utils for form state management and validation
   */
  const { handleSubmit, itemProps } = useForm<TipFormValues>({
    onSubmit: async (values) => {
      if (!values.consent) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Please accept the privacy policy",
        });
        return;
      }

      try {
        // Create email content
        const subject = `Tip for Caschys Blog: ${values.tipTitle}`;
        const body = `Title: ${values.tipTitle}\n\nDescription: ${values.tipContent}\n\nSubmitted by: ${values.name || "Anonymous"}`;

        // Open default email client
        await open(
          `mailto:tipp@stadt-bremerhaven.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        );

        await showToast({
          style: Toast.Style.Success,
          title: "Email client opened",
        });
        pop();
      } catch (error) {
        console.error("Error opening email client:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error opening email client",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    validation: {
      tipTitle: FormValidation.Required,
      tipContent: FormValidation.Required,
      consent: (value) => {
        if (!value) {
          return "You must accept the privacy policy";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Tip" onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="Open Privacy Policy"
            url={PRIVACY_POLICY_URL}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Tip Title" placeholder="e.g., New smartphone from XYZ announced" {...itemProps.tipTitle} />
      <Form.TextArea title="Description" placeholder="Describe your tip in detail..." {...itemProps.tipContent} />
      <Form.TextField
        title="Your Name (optional)"
        placeholder="How would you like to be credited?"
        {...itemProps.name}
      />
      <Form.Separator />
      <Form.Description title="Privacy" text="Please read our privacy policy (⌘D)" />
      <Form.Checkbox label="I agree to the privacy policy" {...itemProps.consent} />
    </Form>
  );
}
