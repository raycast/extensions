import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState, useMemo } from "react";
import {
  RenameRule,
  RuleType,
  ReplaceOptions,
  AddOptions,
  CaseOptions,
  NumberOptions,
  ExtensionOptions,
} from "../lib/rules";
import { randomUUID } from "crypto";

interface AddRuleFormProps {
  onAdd: (rule: RenameRule) => void;
  initialRule?: RenameRule;
}

export default function AddRuleForm({ onAdd, initialRule }: AddRuleFormProps) {
  const { pop } = useNavigation();
  const [type, setType] = useState<RuleType>(initialRule?.type || "replace");

  // Rule State
  const initialOptions = initialRule?.options || {};
  const [find, setFind] = useState((initialOptions as ReplaceOptions).find || "");
  const [replace, setReplace] = useState((initialOptions as ReplaceOptions).replace || "");
  const [isRegex, setIsRegex] = useState((initialOptions as ReplaceOptions).isRegex || false);
  const [caseSensitive, setCaseSensitive] = useState((initialOptions as ReplaceOptions).caseSensitive || false);

  const [text, setText] = useState((initialOptions as AddOptions).text || "");
  const [position, setPosition] = useState((initialOptions as AddOptions).position || "end");

  const [caseFormat, setCaseFormat] = useState((initialOptions as CaseOptions).format || "lowercase");

  const [start, setStart] = useState((initialOptions as NumberOptions).start?.toString() || "1");
  const [step, setStep] = useState((initialOptions as NumberOptions).step?.toString() || "1");
  const [padding, setPadding] = useState((initialOptions as NumberOptions).padding?.toString() || "1");
  const [separator, setSeparator] = useState((initialOptions as NumberOptions).separator || "-");

  const [extMode, setExtMode] = useState((initialOptions as ExtensionOptions).mode || "lowercase");
  const [newExt, setNewExt] = useState((initialOptions as ExtensionOptions).newExt || "");

  const ruleDescription = useMemo(() => {
    switch (type) {
      case "replace":
        return "Find specific text or patterns (Regex) and replace them with something else.";
      case "add":
        return "Insert custom text at the beginning or end of the filename.";
      case "number":
        return "Add a sequential counter to files, useful for sorting or ordering.";
      case "case":
        return "Transform the filename to UPPERCASE, lowercase, or Title Case.";
      case "extension":
        return "Modify the file extension (e.g., .jpg). Change case, remove it, or replace it entirely.";
      case "trim":
        return "Remove whitespace characters from both ends of the filename.";
      default:
        return "";
    }
  }, [type]);

  const handleSubmit = () => {
    let options: object = {};
    switch (type) {
      case "replace":
        options = { find, replace, isRegex, caseSensitive } as ReplaceOptions;
        break;
      case "add":
        options = { text, position } as AddOptions;
        break;
      case "case":
        options = { format: caseFormat } as CaseOptions;
        break;
      case "number":
        options = {
          start: Number(start),
          step: Number(step),
          padding: Number(padding),
          separator,
          position,
        } as NumberOptions;
        break;
      case "extension":
        options = { mode: extMode, newExt } as ExtensionOptions;
        break;
      case "trim":
        options = {};
        break;
    }

    onAdd({
      id: initialRule?.id || randomUUID(),
      type,
      options,
    } as RenameRule);
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

      <Form.Description text={ruleDescription} />

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
          <Form.Dropdown
            id="position"
            title="Position"
            value={position}
            onChange={(v) => setPosition(v as AddOptions["position"])}
          >
            <Form.Dropdown.Item value="start" title="At Beginning" />
            <Form.Dropdown.Item value="end" title="At End" />
          </Form.Dropdown>
        </>
      )}

      {type === "case" && (
        <Form.Dropdown
          id="format"
          title="Format"
          value={caseFormat}
          onChange={(v) => setCaseFormat(v as CaseOptions["format"])}
        >
          <Form.Dropdown.Item value="lowercase" title="lowercase" />
          <Form.Dropdown.Item value="uppercase" title="UPPERCASE" />
          <Form.Dropdown.Item value="capitalize" title="Capitalize" />
          <Form.Dropdown.Item value="titlecase" title="Title Case" />
        </Form.Dropdown>
      )}

      {type === "number" && (
        <>
          <Form.Dropdown
            id="position"
            title="Position"
            value={position}
            onChange={(v) => setPosition(v as NumberOptions["position"])}
          >
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
          <Form.Dropdown
            id="mode"
            title="Action"
            value={extMode}
            onChange={(v) => setExtMode(v as ExtensionOptions["mode"])}
          >
            <Form.Dropdown.Item value="lowercase" title="Lowercase (.jpg)" />
            <Form.Dropdown.Item value="uppercase" title="Uppercase (.JPG)" />
            <Form.Dropdown.Item value="remove" title="Remove Extension" />
            <Form.Dropdown.Item value="replace" title="Replace Extension" />
          </Form.Dropdown>
          {extMode === "replace" && (
            <Form.TextField
              id="newExt"
              title="New Extension"
              value={newExt}
              onChange={setNewExt}
              placeholder="e.g. png (without dot)"
            />
          )}
        </>
      )}
    </Form>
  );
}
