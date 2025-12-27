import { Form, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";
import { validateIMEI, validateIBAN, validateICCID, validateUUID, validateIP } from "./utils/validators";

type ValidationType = "imei" | "iban" | "iccid" | "uuid" | "ip";

const VALIDATION_TYPES: Record<ValidationType, { label: string; placeholder: string }> = {
  imei: { label: "IMEI", placeholder: "Enter 15-digit IMEI (e.g., 123456789012345)" },
  iban: { label: "IBAN", placeholder: "Enter IBAN (e.g., GB82WEST12345698765432)" },
  iccid: { label: "ICCID", placeholder: "Enter 19-20 digit ICCID (e.g., 8939111234567890123)" },
  uuid: { label: "UUID", placeholder: "Enter UUID (e.g., 550e8400-e29b-41d4-a716-446655440000)" },
  ip: { label: "IP Address", placeholder: "Enter IP address (e.g., 192.168.1.1)" },
};

export default function Command() {
  const [validationType, setValidationType] = useState<ValidationType>("imei");

  const handleValidate = async (values: { type: string; value: string }) => {
    const inputValue = values.value?.trim() || "";
    const selectedType = values.type as ValidationType;

    if (!inputValue) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Failed",
        message: "Please enter a value to validate",
      });
      return;
    }

    let isValid = false;
    let validatorName = "";

    switch (selectedType) {
      case "imei":
        isValid = validateIMEI(inputValue);
        validatorName = "IMEI";
        break;
      case "iban":
        isValid = validateIBAN(inputValue);
        validatorName = "IBAN";
        break;
      case "iccid":
        isValid = validateICCID(inputValue);
        validatorName = "ICCID";
        break;
      case "uuid":
        isValid = validateUUID(inputValue);
        validatorName = "UUID";
        break;
      case "ip":
        isValid = validateIP(inputValue);
        validatorName = "IP Address";
        break;
    }

    await showToast({
      style: isValid ? Toast.Style.Success : Toast.Style.Failure,
      title: isValid ? "Valid" : "Invalid",
      message: `${validatorName} is ${isValid ? "valid" : "invalid"}`,
    });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Validate" icon={Icon.Checkmark} onSubmit={handleValidate} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="type"
        title="Identifier Type"
        defaultValue={validationType}
        onChange={(newValue) => setValidationType(newValue as ValidationType)}
      >
        {Object.entries(VALIDATION_TYPES).map(([key, config]) => (
          <Form.Dropdown.Item key={key} value={key} title={config.label} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="value" title="Value to Validate" placeholder={VALIDATION_TYPES[validationType].placeholder} />
    </Form>
  );
}
