import { Form } from "@raycast/api";

interface SecretConfigFormProps {
  values: {
    description: string;
    message: string;
    expiresIn: Date | null;
    sendToEmail: string;
    secretPassword: string;
    secretMaxViews: string;
  };
  onChange: (values: {
    description: string;
    message: string;
    expiresIn: Date | null;
    sendToEmail: string;
    secretPassword: string;
    secretMaxViews: string;
  }) => void;
  validationErrors?: {
    message?: string;
  };
  onClearValidationError?: (field: string) => void;
}

export default function SecretConfigForm({
  values,
  onChange,
  validationErrors,
  onClearValidationError,
}: SecretConfigFormProps) {
  const handleMessageChange = (message: string) => {
    // Clear validation error when user types
    if (validationErrors?.message && onClearValidationError) {
      onClearValidationError("message");
    }
    onChange({ ...values, message });
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
        id="secretDescription"
        title="Secret Description"
        placeholder="Describe this secret"
        value={values.description}
        onChange={(description) => onChange({ ...values, description })}
      />
      <Form.TextField
        id="secretMessage"
        title="Message to Secret Recipient"
        placeholder="Message for the secret recipient"
        value={values.message}
        onChange={handleMessageChange}
        error={validationErrors?.message}
        info="This message will be displayed to the person who receives the secret"
      />
      <Form.DatePicker
        id="secretExpiresIn"
        title="Secret Expires In"
        value={values.expiresIn}
        onChange={(expiresIn) => onChange({ ...values, expiresIn })}
        info="When the secret should expire (minimum 1 hour from now)"
        min={getMinDate()}
      />
      <Form.TextField
        id="sendSecretToEmail"
        title="Send Secret To Email"
        placeholder="email@example.com"
        value={values.sendToEmail}
        onChange={(sendToEmail) => onChange({ ...values, sendToEmail })}
        storeValue={true}
        info="Send created secrets to this email"
      />
      <Form.TextField
        id="secretPassword"
        title="Secret Password"
        placeholder="Optional password for the secret"
        value={values.secretPassword}
        onChange={(secretPassword) => onChange({ ...values, secretPassword })}
        info="Password required to view the secret"
      />
      <Form.TextField
        id="secretMaxViews"
        title="Secret Max Views"
        placeholder="1"
        value={values.secretMaxViews}
        onChange={(secretMaxViews) => onChange({ ...values, secretMaxViews })}
        storeValue={true}
        info="Maximum number of times the secret can be viewed"
      />
    </>
  );
}
