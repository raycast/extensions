import { Form, ActionPanel, Action, popToRoot } from "@raycast/api";
import { showFailureToast, showSuccessToast } from "@raycast/utils";
import React, { useState } from "react";
import { addOTPConfig } from "../utils/storage";
import { parseOTPAuthURL } from "../utils/parser";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [secretError, setSecretError] = useState<string | undefined>();

  async function handleSubmit(values: {
    name: string;
    issuer?: string;
    secret: string;
    algorithm: "SHA1" | "SHA256" | "SHA512";
    digits: string;
    period: string;
  }) {
    try {
      setIsLoading(true);

      if (!values.name) {
        setNameError("Name is required");
        return;
      }

      if (!values.secret) {
        setSecretError("Secret is required");
        return;
      }

      // Build the OTP URL
      const otpUrl = `otpauth://totp/${encodeURIComponent(values.name)}?secret=${
        values.secret
      }&algorithm=${values.algorithm}&digits=${values.digits}&period=${
        values.period
      }${values.issuer ? `&issuer=${encodeURIComponent(values.issuer)}` : ""}`;

      // Parse the URL to validate
      const config = parseOTPAuthURL(otpUrl);

      if (!config) {
        showFailureToast("Invalid OTP data");
        return;
      }

      // Save the configuration
      await addOTPConfig(config);

      showSuccessToast("OTP code added successfully");

      // Return to main view
      popToRoot();
    } catch (error) {
      console.error("Error adding OTP code:", error);
      showFailureToast("An error occurred while adding the OTP code");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Service name"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="issuer"
        title="Issuer (optional)"
        placeholder="Company or issuing service"
      />
      <Form.TextField
        id="secret"
        title="Secret"
        placeholder="Secret key (Base32)"
        error={secretError}
        onChange={() => setSecretError(undefined)}
      />
      <Form.Dropdown id="algorithm" title="Algorithm" defaultValue="SHA1">
        <Form.Dropdown.Item value="SHA1" title="SHA1" />
        <Form.Dropdown.Item value="SHA256" title="SHA256" />
        <Form.Dropdown.Item value="SHA512" title="SHA512" />
      </Form.Dropdown>
      <Form.TextField id="digits" title="Digits" placeholder="Number of digits" defaultValue="6" />
      <Form.TextField
        id="period"
        title="Period (seconds)"
        placeholder="Code duration"
        defaultValue="30"
      />
    </Form>
  );
}
