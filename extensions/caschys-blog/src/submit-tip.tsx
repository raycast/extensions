// src/submit-tip.tsx
import React from "react";

import { Form, ActionPanel, Action, showToast, Toast, useNavigation, open } from "@raycast/api";
import { useState } from "react";

const PRIVACY_POLICY_URL = "https://stadt-bremerhaven.de/datenschutzerklaerung/";

export default function SubmitTip() {
  const { pop } = useNavigation();
  const [tipTitle, setTipTitle] = useState<string>("");
  const [tipContent, setTipContent] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [consent, setConsent] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!consent) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please accept the privacy policy",
      });
      return;
    }

    if (!tipTitle.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a title for your tip",
      });
      return;
    }

    if (!tipContent.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please describe your tip",
      });
      return;
    }

    try {
      // Create email content
      const subject = `Tip for Caschys Blog: ${tipTitle}`;
      const body = `Title: ${tipTitle}\n\nDescription: ${tipContent}\n\nSubmitted by: ${name || "Anonymous"}`;

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
  };

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
      <Form.TextField
        id="tipTitle"
        title="Tip Title"
        placeholder="e.g., New smartphone from XYZ announced"
        value={tipTitle}
        onChange={setTipTitle}
      />
      <Form.TextArea
        id="tipContent"
        title="Description"
        placeholder="Describe your tip in detail..."
        value={tipContent}
        onChange={setTipContent}
      />
      <Form.TextField
        id="name"
        title="Your Name (optional)"
        placeholder="How would you like to be credited?"
        value={name}
        onChange={setName}
      />
      <Form.Separator />
      <Form.Description title="Privacy" text="Please read our privacy policy (⌘D)" />
      <Form.Checkbox id="consent" label="I agree to the privacy policy" value={consent} onChange={setConsent} />
    </Form>
  );
}
