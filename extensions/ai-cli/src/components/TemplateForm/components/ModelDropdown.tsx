import { Form } from "@raycast/api";
import { messages } from "@/locale/en/messages";
import { getAgent } from "@/agents";

interface ModelDropdownProps {
  agentId: string; // Add agent ID prop
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export default function ModelDropdown({ agentId, value, error, onChange }: ModelDropdownProps) {
  const agent = getAgent(agentId);
  const models = Object.values(agent.models);

  return (
    <Form.Dropdown
      id="model"
      title={messages.ui.form.modelTitle}
      info={messages.ui.form.modelHint}
      value={value}
      error={error}
      onChange={onChange}
    >
      {models.map((model) => (
        <Form.Dropdown.Item key={model.id} value={model.displayName} title={model.displayName} />
      ))}
    </Form.Dropdown>
  );
}
