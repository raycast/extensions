import React, { useState } from "react";
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { addOTPConfig } from "./utils/storage";
import { OTPConfig } from "./types";
import crypto from "crypto";

export default function Command() {
  const [nameError, setNameError] = useState<string | undefined>();
  const [secretError, setSecretError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: {
    name: string;
    issuer?: string;
    secret: string;
    algorithm: string;
    digits: string;
    period: string;
  }) {
    if (!values.name) {
      setNameError("Name is required");
      return;
    }

    if (!values.secret) {
      setSecretError("Secret is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const config: OTPConfig = {
        id: crypto.randomUUID(),
        name: values.name,
        issuer: values.issuer,
        secret: values.secret.replace(/\s/g, ""),
        algorithm: values.algorithm as "SHA1" | "SHA256" | "SHA512",
        digits: parseInt(values.digits, 10),
        period: parseInt(values.period, 10),
      };

      await addOTPConfig(config);

      showToast({
        style: Toast.Style.Success,
        title: "OTP Added",
        message: "The OTP code has been added successfully",
      });

      // Reset form or close
    } catch (error) {
      console.error("Error adding OTP:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to add OTP code",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Otp/2fa" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter a name for this OTP"
        error={nameError}
        onChange={() => setNameError(undefined)}
        autoFocus
      />

      <Form.TextField
        id="issuer"
        title="Issuer (Optional)"
        placeholder="Enter the service provider name"
      />

      <Form.TextField
        id="secret"
        title="Secret Key"
        placeholder="Enter the secret key"
        error={secretError}
        onChange={() => setSecretError(undefined)}
      />

      <Form.Dropdown id="algorithm" title="Algorithm" defaultValue="SHA1">
        <Form.Dropdown.Item value="SHA1" title="SHA1" />
        <Form.Dropdown.Item value="SHA256" title="SHA256" />
        <Form.Dropdown.Item value="SHA512" title="SHA512" />
      </Form.Dropdown>

      <Form.Dropdown id="digits" title="Digits" defaultValue="6">
        <Form.Dropdown.Item value="6" title="6 digits" />
        <Form.Dropdown.Item value="8" title="8 digits" />
      </Form.Dropdown>

      <Form.Dropdown id="period" title="Period (seconds)" defaultValue="30">
        <Form.Dropdown.Item value="10" title="10 seconds" />
        <Form.Dropdown.Item value="30" title="30 seconds" />
        <Form.Dropdown.Item value="60" title="60 seconds" />
      </Form.Dropdown>
    </Form>
  );
}
