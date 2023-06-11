import { Form } from "@raycast/api";
import { Thread } from "../types/threads.types";

interface ThreadDropdownProps {
  threads?: Array<Thread>;
  onChange: (thread: Thread) => void;
  isLoading: boolean;
}

export default (props: ThreadDropdownProps) => {
  const { threads, onChange } = props;
  return (
    <Form.Dropdown
      id="dropdown"
      title="Thread"
      storeValue={true}
      onChange={(newValue) => {
        onChange(threads?.find((thread) => thread.key === newValue) as Thread);
      }}
    >
      <Form.Dropdown.Section title="Threads">
        {threads?.map((thread) => (
          <Form.Dropdown.Item key={thread.key} title={thread.title} value={thread.key} />
        ))}
      </Form.Dropdown.Section>
    </Form.Dropdown>
  );
};
