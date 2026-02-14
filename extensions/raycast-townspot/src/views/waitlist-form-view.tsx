import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { submitWaitlist } from "../lib/waitlist";

type WaitlistFormValues = {
  email: string;
  location: string;
  message?: string;
};

type WaitlistFormViewProps = {
  endpointUrl: string;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const WaitlistFormView = ({ endpointUrl }: WaitlistFormViewProps) => {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: WaitlistFormValues): Promise<void> => {
    const email = String(values.email || "").trim();
    const location = String(values.location || "").trim();
    const message = String(values.message || "").trim();

    if (!emailRegex.test(email)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a valid email address.",
      });
      return;
    }

    if (!location) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter your town and country.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitWaitlist(endpointUrl, { email, location, message });
      await showToast({
        style: Toast.Style.Success,
        title: "Thanks! We'll be in touch if we head your way.",
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      navigationTitle="Tell us your town"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isSubmitting ? "Submitting..." : "Submit"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Not from around here, huh? Tell us your town." />
      <Form.TextField id="email" title="Your email" placeholder="you@example.com" />
      <Form.TextField id="location" title="Your town, country" placeholder="Your town, country" />
      <Form.TextArea id="message" title="Anything else? (optional)" placeholder="Anything else? (optional)" />
    </Form>
  );
};
