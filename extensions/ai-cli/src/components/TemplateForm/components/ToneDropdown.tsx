import { Form, useNavigation } from "@raycast/api";
import { messages } from "@/locale/en/messages";
import { renderDropdownItems } from "@/components/shared/utils";
import { CustomTone } from "@/hooks/useCustomTones";
import { UI_CONSTANTS } from "@/constants/ui";
import { MANAGEMENT_CONFIG } from "@/constants";
import CustomToneManager from "@/components/CustomToneManager/CustomToneManager";

interface ToneDropdownProps {
  allTones: CustomTone[];
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onValidationError: (field: string, error?: string) => void;
  onManagePop: () => void;
}

export default function ToneDropdown({
  allTones,
  value,
  error,
  onChange,
  onValidationError,
  onManagePop,
}: ToneDropdownProps) {
  const { push } = useNavigation();

  // Handle dropdown value changes with navigation support
  const handleToneChange = (value: string) => {
    if (value === `${MANAGEMENT_CONFIG.MANAGE_PREFIX}TONES`) {
      // Clear any validation errors before navigating
      onValidationError("tone", undefined);
      push(<CustomToneManager />, onManagePop);
      return;
    }

    // Handle normal dropdown value changes
    onChange(value);
  };

  return (
    <Form.Dropdown
      id="tone"
      title={messages.ui.form.toneTitle}
      info={messages.ui.form.toneHint}
      value={value}
      error={error}
      onChange={handleToneChange}
    >
      {renderDropdownItems({
        items: allTones,
        fallbackIcon: UI_CONSTANTS.ENTITY_ICONS.TONE,
        priorityItemId: "default",
      })}
      <Form.Dropdown.Section>
        <Form.Dropdown.Item
          key={`${MANAGEMENT_CONFIG.MANAGE_PREFIX}TONES`}
          value={`${MANAGEMENT_CONFIG.MANAGE_PREFIX}TONES`}
          title={messages.actions.manageTones}
          icon={UI_CONSTANTS.ENTITY_ICONS.MANAGEMENT}
        />
      </Form.Dropdown.Section>
    </Form.Dropdown>
  );
}
