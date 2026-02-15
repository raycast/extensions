import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { RenameRule, RuleType } from "../lib/rules";
import { v4 as uuidv4 } from "uuid";

interface AddRuleFormProps {
  onAdd: (rule: RenameRule) => void;
  initialRule?: RenameRule;
}

export default function AddRuleForm({ onAdd, initialRule }: AddRuleFormProps) {
  const { pop } = useNavigation();
  const [type, setType] = useState<RuleType>(initialRule?.type || "replace");

  // Rule State
  const [find, setFind] = useState(initialRule?.options.find || "");
  const [replace, setReplace] = useState(initialRule?.options.replace || "");
  const [isRegex, setIsRegex] = useState(initialRule?.options.isRegex || false);
  const [caseSensitive, setCaseSensitive] = useState(initialRule?.options.caseSensitive || false);

  const [text, setText] = useState(initialRule?.options.text || "");
  const [position, setPosition] = useState(initialRule?.options.position || "end");

  const [caseFormat, setCaseFormat] = useState(initialRule?.options.format || "lowercase");

  const [start, setStart] = useState(initialRule?.options.start?.toString() || "1");
  const [step, setStep] = useState(initialRule?.options.step?.toString() || "1");
  const [padding, setPadding] = useState(initialRule?.options.padding?.toString() || "1");
  const [separator, setSeparator] = useState(initialRule?.options.separator || "-");

  const [extMode, setExtMode] = useState(initialRule?.options.mode || "lowercase");
  const [newExt, setNewExt] = useState(initialRule?.options.newExt || "");

  const handleSubmit = () => {
    let options = {};
    switch (type) {
      case "replace":
        options = { find, replace, isRegex, caseSensitive };
        break;
      case "add":
        options = { text, position };
        break;
      case "case":
        options = { format: caseFormat };
        break;
      case "number":
        options = { start: Number(start), step: Number(step), padding: Number(padding), separator, position };
        break;
      case "extension":
        options = { mode: extMode, newExt };
        break;
      case "trim":
        options = {};
        break;
    }

    onAdd({
      id: initialRule?.id || uuidv4(),
      type,
      options,
    });
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={initialRule ? "Update Rule" : "Add Rule"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Rule Type" value={type} onChange={(v) => setType(v as RuleType)}>
        <Form.Dropdown.Item value="replace" title="Find & Replace" icon={Icon.MagnifyingGlass} />
        <Form.Dropdown.Item value="add" title="Add Text" icon={Icon.Plus} />
        <Form.Dropdown.Item value="number" title="Numbering" icon={Icon.Hashtag} />
        <Form.Dropdown.Item value="case" title="Change Case" icon={Icon.Text} />
        <Form.Dropdown.Item value="extension" title="Extension" icon={Icon.Document} />
        <Form.Dropdown.Item value="trim" title="Trim Whitespace" icon={Icon.Eraser} />
      </Form.Dropdown>

      {type === "replace" && (
        <>
          <Form.TextField id="find" title="Find" value={find} onChange={setFind} placeholder="Text to find" />
          <Form.TextField
            id="replace"
            title="Replace"
            value={replace}
            onChange={setReplace}
            placeholder="Replacement text"
          />
          <Form.Checkbox id="isRegex" label="Use Regular Expressions" value={isRegex} onChange={setIsRegex} />
          <Form.Checkbox id="caseSensitive" label="Case Sensitive" value={caseSensitive} onChange={setCaseSensitive} />
        </>
      )}

      {type === "add" && (
        <>
          <Form.TextField id="text" title="Text" value={text} onChange={setText} placeholder="Text to add" />
          <Form.Dropdown id="position" title="Position" value={position} onChange={setPosition}>
            <Form.Dropdown.Item value="start" title="At Beginning" />
            <Form.Dropdown.Item value="end" title="At End" />
          </Form.Dropdown>
        </>
      )}

      {type === "case" && (
        <Form.Dropdown id="format" title="Format" value={caseFormat} onChange={setCaseFormat}>
          <Form.Dropdown.Item value="lowercase" title="lowercase" />
          <Form.Dropdown.Item value="uppercase" title="UPPERCASE" />
          <Form.Dropdown.Item value="capitalize" title="Capitalize" />
          <Form.Dropdown.Item value="titlecase" title="Title Case" />
        </Form.Dropdown>
      )}

      {type === "number" && (
        <>
          <Form.Dropdown id="position" title="Position" value={position} onChange={setPosition}>
            <Form.Dropdown.Item value="end" title="At End (Suffix)" />
            <Form.Dropdown.Item value="start" title="At Start (Prefix)" />
          </Form.Dropdown>
          <Form.TextField id="start" title="Start At" value={start} onChange={setStart} />
          <Form.TextField id="step" title="Increment By" value={step} onChange={setStep} />
          <Form.TextField id="padding" title="Padding (Digits)" value={padding} onChange={setPadding} />
          <Form.TextField id="separator" title="Separator" value={separator} onChange={setSeparator} />
        </>
      )}

      {type === "extension" && (
        <>
          <Form.Dropdown id="mode" title="Action" value={extMode} onChange={setExtMode}>
            <Form.Dropdown.Item value="lowercase" title="Lowercase" />
            <Form.Dropdown.Item value="uppercase" title="Uppercase" />
            <Form.Dropdown.Item value="remove" title="Remove" />
            <Form.Dropdown.Item value="replace" title="Replace" />
          </Form.Dropdown>
          {extMode === "replace" && (
            <Form.TextField
              id="newExt"
              title="New Extension"
              value={newExt}
              onChange={setNewExt}
              placeholder="e.g. jpg"
            />
          )}
        </>
      )}
    </Form>
  );
}
