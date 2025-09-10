import { Form } from "@raycast/api";
import { AGENTS } from "@/agents";

interface AgentDropdownProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export default function AgentDropdown({ value, error, onChange }: AgentDropdownProps) {
  return (
    <Form.Dropdown
      id="selectedAgent"
      title="AI Agent"
      info="Select the AI agent to use for processing"
      value={value}
      error={error}
      onChange={onChange}
    >
      {Object.values(AGENTS).map((agent) => (
        <Form.Dropdown.Item key={agent.id} value={agent.id} title={agent.name} />
      ))}
    </Form.Dropdown>
  );
}
