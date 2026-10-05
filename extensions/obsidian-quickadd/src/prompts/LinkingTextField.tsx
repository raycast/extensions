import { Form, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { hashTriggerAt, insertLink, insertTag, linkTriggerAt } from "../links";
import { VaultRef } from "../suggestions";
import LinkPicker from "./LinkPicker";
import TagPicker from "./TagPicker";

type Props = {
  id: string;
  title: string;
  vault: VaultRef;
  multiline?: boolean;
  defaultValue?: string;
  placeholder?: string;
  info?: string;
  error?: string;
  autoFocus?: boolean;
  onChange?: () => void;
};

/**
 * Text field or area with Obsidian-style suggestions: `[[` opens a link picker, and `#` at the start of a word
 * opens a tag picker (full mode only: tags come from Obsidian's index).
 */
export default function LinkingTextField({ vault, multiline, defaultValue, onChange, ...field }: Props) {
  const { push, pop } = useNavigation();
  const [value, setValue] = useState(defaultValue ?? "");
  const ref = useRef<Form.TextField>(null);
  // Bumped when a picker closes (after a pick or Esc): once the form is back, put the cursor here again.
  const [refocus, setRefocus] = useState(0);

  useEffect(() => {
    if (refocus > 0) ref.current?.focus();
  }, [refocus]);

  function change(next: string) {
    const linkAt = linkTriggerAt(value, next);
    const tagAt = linkAt === undefined && vault.cli ? hashTriggerAt(value, next) : undefined;
    setValue(next);
    onChange?.();
    const finish = (replaced: string) => {
      setValue(replaced);
      pop();
    };
    const refocusField = () => setRefocus((n) => n + 1);
    if (linkAt !== undefined) {
      push(
        <LinkPicker vault={vault} onPick={(link) => finish(insertLink(next, linkAt, link))} onClose={refocusField} />,
      );
    } else if (tagAt !== undefined) {
      push(<TagPicker vault={vault} onPick={(tag) => finish(insertTag(next, tagAt, tag))} onClose={refocusField} />);
    }
  }

  return multiline ? (
    <Form.TextArea ref={ref} {...field} value={value} onChange={change} />
  ) : (
    <Form.TextField ref={ref} {...field} value={value} onChange={change} />
  );
}
