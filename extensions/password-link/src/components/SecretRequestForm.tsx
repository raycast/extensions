import { Form } from "@raycast/api";

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

export default function SecretRequestForm({
  values,
  onChange,
  validationErrors,
  onClearValidationError,
}: SecretRequestFormProps) {
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
        onChange={(limit) => onChange({ ...values, limit })}
        storeValue={true}
        info="How many times the request can be used"
      />
      <Form.TextField
        id="sendRequestToEmail"
        title="Send Request To Email"
        placeholder="email@example.com"
        value={values.sendRequestToEmail}
        onChange={(sendRequestToEmail) => onChange({ ...values, sendRequestToEmail })}
        info="Send the request link to this email"
      />
    </>
  );
}
