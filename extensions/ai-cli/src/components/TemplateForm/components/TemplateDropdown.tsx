import { Form, useNavigation } from "@raycast/api";
import { messages } from "@/locale/en/messages";
import { renderDropdownItems } from "@/components/shared/utils";
import { CustomTemplate } from "@/hooks/useCustomTemplates";
import { UI_CONSTANTS } from "@/constants/ui";
import { MANAGEMENT_CONFIG } from "@/constants";
import CustomTemplateManager from "@/components/CustomTemplateManager/CustomTemplateManager";

interface TemplateDropdownProps {
  allTemplates: CustomTemplate[];
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onValidationError: (field: string, error?: string) => void;
  onManagePop: () => void;
}

export default function TemplateDropdown({
  allTemplates,
  value,
  error,
  onChange,
  onValidationError,
  onManagePop,
}: TemplateDropdownProps) {
  const { push } = useNavigation();

  // Handle dropdown value changes with navigation support
  const handleTemplateChange = (value: string) => {
    if (value === `${MANAGEMENT_CONFIG.MANAGE_PREFIX}TEMPLATES`) {
      // Clear any validation errors before navigating
      onValidationError("template", undefined);
      push(<CustomTemplateManager />, onManagePop);
      return;
    }

    // Handle normal dropdown value changes
    onChange(value);
  };

  return (
    <Form.Dropdown
      id="template"
      title={messages.ui.form.templateTitle}
      info={messages.ui.form.templateHint}
      value={value}
      error={error}
      onChange={handleTemplateChange}
      data-testid="select-format"
    >
      {renderDropdownItems({
        items: allTemplates,
        fallbackIcon: UI_CONSTANTS.ENTITY_ICONS.TEMPLATE,
      })}
      <Form.Dropdown.Section>
        <Form.Dropdown.Item
          key={`${MANAGEMENT_CONFIG.MANAGE_PREFIX}TEMPLATES`}
          value={`${MANAGEMENT_CONFIG.MANAGE_PREFIX}TEMPLATES`}
          title={messages.actions.manageTemplates}
          icon={UI_CONSTANTS.ENTITY_ICONS.MANAGEMENT}
        />
      </Form.Dropdown.Section>
    </Form.Dropdown>
  );
}
