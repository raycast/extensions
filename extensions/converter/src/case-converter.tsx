import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { isEmpty } from "./utils/common-utils";
import { buildUnicode, chineseUtf8ToNative, unicodesToNative } from "./utils/code-converter-utils";
import {
  Case,
  getNativeCase,
  nativeToCamel,
  nativeToTitle,
  nativeToKebab,
  nativeToLower,
  nativeToPascal,
  nativeToSnake,
  nativeToUpper,
} from "./utils/case-converter-utils";

export default function CreateShortcut() {
  const [nativeString, setNativeString] = useState<{ str: string; case: Case }>({ str: "", case: Case.NATIVE });
  const [native, setNative] = useState<string>("");
  const [camel, setCamel] = useState<string>("");
  const [pascal, setPascal] = useState<string>("");
  const [snake, setSnake] = useState<string>("");
  const [kebab, setKebab] = useState<string>("");
  const [upper, setUpper] = useState<string>("");
  const [lower, setLower] = useState<string>("");
  const [title, setTitle] = useState<string>("");

  useEffect(() => {
    async function _fetchDetail() {
      try {
        if (isEmpty(nativeString.str)) return;

        const _native = getNativeCase(nativeString);
        console.debug("_native:", _native);
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
            <Action.CopyToClipboard
              title={"Copy Unicode"}
              content={camel}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
            />
            <Action.CopyToClipboard title={"Copy UTF-8"} content={snake} shortcut={{ modifiers: ["cmd"], key: "3" }} />
            <Action.CopyToClipboard title={"Copy ASCII"} content={pascal} shortcut={{ modifiers: ["cmd"], key: "4" }} />
            <Action.CopyToClipboard
              title={"Copy &#xXXXX;"}
              content={kebab}
              shortcut={{ modifiers: ["cmd"], key: "5" }}
            />
            <Action.CopyToClipboard title={"Copy Base64"} content={upper} shortcut={{ modifiers: ["cmd"], key: "6" }} />
            <Action.CopyToClipboard
              title={"Copy Encoded URL"}
              content={lower}
              shortcut={{ modifiers: ["cmd"], key: "7" }}
            />
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
        placeholder={"Any case"}
        onChange={(newValue) => {
          setNativeString({ str: newValue, case: Case.NATIVE });
        }}
      />
      <Form.TextField
        id={"Camel"}
        title="Camel"
        value={camel}
        placeholder={"camelCase"}
        onChange={(newValue) => {
          setNativeString({ str: newValue, case: Case.CAMEL });
        }}
      />
      <Form.TextField
        id={"Pascal"}
        title="Pascal"
        value={pascal}
        placeholder={"PascalCase"}
        onChange={(newValue) => {
          setNativeString({ str: newValue, case: Case.PASCAL });
        }}
      />
      <Form.TextField
        id={"Snake"}
        title="Snake"
        value={snake}
        placeholder={"snake-case"}
        onChange={(newValue) => {
          setNativeString({ str: newValue, case: Case.SNAKE });
        }}
      />
      <Form.TextField
        id={"Kebab"}
        title="Kebab"
        value={kebab}
        placeholder={"kebab-case"}
        onChange={(newValue) => {
          setNativeString({ str: newValue, case: Case.KEBAB });
        }}
      />
      <Form.TextField
        id={"Upper"}
        title="Upper"
        value={upper}
        placeholder={"UPPER CASE"}
        onChange={(newValue) => {
          setNativeString({ str: newValue, case: Case.UPPER });
        }}
      />
      <Form.TextField
        id={"Lower"}
        title="Lower"
        value={lower}
        placeholder={"lower case"}
        onChange={(newValue) => {
          setNativeString({ str: newValue, case: Case.LOWER });
        }}
      />
      <Form.TextField
        id={"Title"}
        title="Title"
        value={title}
        placeholder={"Title"}
        onChange={(newValue) => {
          setNativeString({ str: newValue, case: Case.TITLE });
        }}
      />
    </Form>
  );
}
