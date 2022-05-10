import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  Case,
  getNativeCase,
  nativeToCamel,
  nativeToKebab,
  nativeToLower,
  nativeToPascal,
  nativeToSnake,
  nativeToTitle,
  nativeToUpper,
} from "./utils/case-converter-utils";
import { commonPreferences, isEmpty } from "./utils/common-utils";
import { getInputItem } from "./hooks/get-input-item";

export default function CaseConverter() {
  const { autoDetect, priorityDetection } = commonPreferences();

  const [nativeString, setNativeString] = useState<{ str: string; case: Case }>({ str: "", case: Case.NATIVE });
  const [native, setNative] = useState<string>("");
  const [camel, setCamel] = useState<string>("");
  const [pascal, setPascal] = useState<string>("");
  const [snake, setSnake] = useState<string>("");
  const [kebab, setKebab] = useState<string>("");
  const [upper, setUpper] = useState<string>("");
  const [lower, setLower] = useState<string>("");
  const [title, setTitle] = useState<string>("");

  const inputItem = getInputItem(autoDetect, priorityDetection);
  useEffect(() => {
    async function _fetch() {
      setNativeString({ str: inputItem, case: Case.NATIVE });
    }

    _fetch().then();
  }, [inputItem]);

  useEffect(() => {
    async function _fetchDetail() {
      try {
        let _native = "";
        if (!isEmpty(nativeString.str)) {
          _native = getNativeCase(nativeString);
        }
        setNative(_native);
        setCamel(nativeToCamel(_native));
        setPascal(nativeToPascal(_native));
        setSnake(nativeToSnake(_native));
        setKebab(nativeToKebab(_native));
        setUpper(nativeToUpper(_native));
        setLower(nativeToLower(_native));
        setTitle(nativeToTitle(_native));
      } catch (e) {
        console.error(String(e));
      }
    }

    _fetchDetail().then();
  }, [nativeString]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={"Copy Native"} content={native} shortcut={{ modifiers: ["cmd"], key: "1" }} />
          <ActionPanel.Section>
            <Action.CopyToClipboard title={"Copy Camel"} content={camel} shortcut={{ modifiers: ["cmd"], key: "2" }} />
            <Action.CopyToClipboard title={"Copy Pascal"} content={snake} shortcut={{ modifiers: ["cmd"], key: "3" }} />
            <Action.CopyToClipboard title={"Copy Snake"} content={pascal} shortcut={{ modifiers: ["cmd"], key: "4" }} />
            <Action.CopyToClipboard title={"Copy Kebab"} content={kebab} shortcut={{ modifiers: ["cmd"], key: "5" }} />
            <Action.CopyToClipboard title={"Copy Upper"} content={upper} shortcut={{ modifiers: ["cmd"], key: "6" }} />
            <Action.CopyToClipboard title={"Copy Lower"} content={lower} shortcut={{ modifiers: ["cmd"], key: "7" }} />
            <Action.CopyToClipboard title={"Copy Title"} content={title} shortcut={{ modifiers: ["cmd"], key: "8" }} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              icon={Icon.Trash}
              title={"Clear All"}
              shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
              onAction={() => {
                setNativeString({ str: "", case: Case.NATIVE });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id={"Native"}
        title="Native"
        value={native}
        placeholder={"Native case"}
        onChange={(newValue) => {
          setNativeString({ str: newValue.trim(), case: Case.NATIVE });
        }}
      />
      <Form.TextField
        id={"Camel"}
        title="Camel"
        value={camel}
        placeholder={"camelCase"}
        onChange={(newValue) => {
          setNativeString({ str: newValue.trim(), case: Case.CAMEL });
        }}
      />
      <Form.TextField
        id={"Pascal"}
        title="Pascal"
        value={pascal}
        placeholder={"PascalCase"}
        onChange={(newValue) => {
          setNativeString({ str: newValue.trim(), case: Case.PASCAL });
        }}
      />
      <Form.TextField
        id={"Snake"}
        title="Snake"
        value={snake}
        placeholder={"snake-case"}
        onChange={(newValue) => {
          setNativeString({ str: newValue.trim(), case: Case.SNAKE });
        }}
      />
      <Form.TextField
        id={"Kebab"}
        title="Kebab"
        value={kebab}
        placeholder={"kebab-case"}
        onChange={(newValue) => {
          setNativeString({ str: newValue.trim(), case: Case.KEBAB });
        }}
      />
      <Form.TextField
        id={"Upper"}
        title="Upper"
        value={upper}
        placeholder={"UPPER CASE"}
        onChange={(newValue) => {
          setNativeString({ str: newValue.trim(), case: Case.UPPER });
        }}
      />
      <Form.TextField
        id={"Lower"}
        title="Lower"
        value={lower}
        placeholder={"lower case"}
        onChange={(newValue) => {
          setNativeString({ str: newValue.trim(), case: Case.LOWER });
        }}
      />
      <Form.TextField
        id={"Title"}
        title="Title"
        value={title}
        placeholder={"Title"}
        onChange={(newValue) => {
          setNativeString({ str: newValue.trim(), case: Case.TITLE });
        }}
      />
    </Form>
  );
}
