import { Form } from "@raycast/api";
import { modifiers, keyToAppleScriptCode } from "../../constants";

interface IProps {
  id: string;
  title: string;
  onChange: (shortcut: string[]) => void;
  value: string[];
  error?: string;
}

export const ShortcutPicker = ({ id, title, onChange, value, error }: IProps) => {
  return (
    <Form.TagPicker error={error} onChange={onChange} value={value} id={id} title={title} placeholder="Choose shortcut">
      {[...modifiers, ...Object.keys(keyToAppleScriptCode)].map((modifier) => (
        <Form.TagPicker.Item key={modifier} value={modifier} title={modifier} />
      ))}
    </Form.TagPicker>
  );
};
