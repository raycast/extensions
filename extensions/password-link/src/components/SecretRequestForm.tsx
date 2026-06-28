import { Form } from "@raycast/api";
import { useState } from "react";

interface SecretRequestFormProps {
  values: {
    description: string;
    message: string;
    expiration: Date | null;
    limit: string;
    sendRequestToEmail: string;
  };
  onChange: (values: {
    description: string;
    message: string;
    expiration: Date | null;
    limit: string;
    sendRequestToEmail: string;
  }) => void;
  validationErrors?: {
    message?: string;
  };
  onClearValidationError?: (field: string) => void;
}

function validateEmail(email: string): boolean {
  // Simple email regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateLimit(limit: string): boolean {
  return /^\d+$/.test(limit) && Number(limit) > 0;
}

export default function SecretRequestForm({
  values,
  onChange,
  validationErrors,
  onClearValidationError,
}: SecretRequestFormProps) {
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [limitError, setLimitError] = useState<string | undefined>(undefined);

  const handleMessageChange = (message: string) => {
    // Clear validation error when user types
    if (validationErrors?.message && onClearValidationError) {
      onClearValidationError("message");
    }
    onChange({ ...values, message });
  };

  const handleEmailChange = (sendRequestToEmail: string) => {
    if (sendRequestToEmail.length === 0 || validateEmail(sendRequestToEmail)) {
      setEmailError(undefined);
    } else {
      setEmailError("Please enter a valid email address");
    }
    onChange({ ...values, sendRequestToEmail });
  };

  const handleLimitChange = (limit: string) => {
    if (limit.length === 0 || validateLimit(limit)) {
      setLimitError(undefined);
    } else {
      setLimitError("Usage limit must be a positive number");
    }
    onChange({ ...values, limit });
  };

  // Set minimum date to 1 hour from now
  const getMinDate = () => {
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 1);
    return minDate;
  };

  return (
    <>
      <Form.TextField
        id="requestDescription"
        title="Request Description"
        placeholder="Describe what you're requesting (Internal only)"
        value={values.description}
        onChange={(description) => onChange({ ...values, description })}
      />
      <Form.TextField
        id="requestMessage"
        title="Message for Request"
        placeholder="Message that will be shown on the request page"
        value={values.message}
        onChange={handleMessageChange}
        error={validationErrors?.message}
        info="This message will be displayed on the request page for people to see"
      />
      <Form.DatePicker
        id="requestExpiration"
        title="Request Expiration"
        value={values.expiration}
        onChange={(expiration) => onChange({ ...values, expiration })}
        info="When the request link should expire (minimum 1 hour from now)"
        min={getMinDate()}
      />
      <Form.TextField
        id="requestLimit"
        title="Usage Limit"
        placeholder="1"
        value={values.limit}
        onChange={handleLimitChange}
        error={limitError}
        storeValue={true}
        info="How many times the request can be used"
      />
      <Form.TextField
        id="sendRequestToEmail"
        title="Send Request To Email"
        placeholder="email@example.com"
        value={values.sendRequestToEmail}
        onChange={handleEmailChange}
        error={emailError}
        info="Send the request link to this email"
      />
    </>
  );
}
