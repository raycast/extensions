import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { commonPreferences, isEmpty } from "./utils/common-utils";
import { buildUnicode, chineseUtf8ToNative, unicodesToNative } from "./utils/code-converter-utils";
import { getInputItem } from "./hooks/get-input-item";

export default function CodeConverter() {
  const { autoDetect, priorityDetection } = commonPreferences();

  const [native, setNative] = useState<string>("");
  const [unicode, setUnicode] = useState<string>("");
  const [ascii, setAscii] = useState<string>("");
  const [utf8, setUtf8] = useState<string>("");
  const [chineseUtf8, setChineseUtf8] = useState<string>("");
  const [base64, setBase64] = useState<string>("");
  const [url, setUrl] = useState<string>("");

  const inputItem = getInputItem(autoDetect, priorityDetection);
  useEffect(() => {
    async function _fetch() {
      setNative(inputItem);
    }

    _fetch().then();
  }, [inputItem]);

  useEffect(() => {
    async function _fetchDetail() {
      try {
        if (native.includes("\uD800") || native.includes("\uDFFF")) return;
        let _ascii = "";
        let _unicode = "";
        let _chineseUtf8 = "";
        native.split("").forEach((char) => {
          _ascii += char.charCodeAt(0);
          const _u = buildUnicode(char);
          _unicode += "\\u" + _u;
          _chineseUtf8 += "&#x" + _u + ";";
        });
        setAscii(_ascii);
        setUnicode(_unicode);
        setUtf8(encodeURIComponent(native).replaceAll("%", "\\x"));
        setChineseUtf8(_chineseUtf8);
        setBase64(Buffer.from(native, "utf-8").toString("base64"));
        setUrl(encodeURIComponent(native));
      } catch (e) {
        console.error(String(e));
      }
    }

    _fetchDetail().then();
  }, [native]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={"Copy Native"} content={native} shortcut={{ modifiers: ["cmd"], key: "1" }} />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title={"Copy Unicode"}
              content={unicode}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
            />
            <Action.CopyToClipboard title={"Copy UTF-8"} content={utf8} shortcut={{ modifiers: ["cmd"], key: "3" }} />
            <Action.CopyToClipboard title={"Copy ASCII"} content={ascii} shortcut={{ modifiers: ["cmd"], key: "4" }} />
            <Action.CopyToClipboard
              title={"Copy &#xXXXX;"}
              content={chineseUtf8}
              shortcut={{ modifiers: ["cmd"], key: "5" }}
            />
            <Action.CopyToClipboard
              title={"Copy Base64"}
              content={base64}
              shortcut={{ modifiers: ["cmd"], key: "6" }}
            />
            <Action.CopyToClipboard
              title={"Copy Encoded URL"}
              content={url}
              shortcut={{ modifiers: ["cmd"], key: "7" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              icon={Icon.Trash}
              title={"Clear All"}
              shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
              onAction={() => {
                setNative("");
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField id={"Native"} title="Native" value={native} placeholder={"String"} onChange={setNative} />
      <Form.TextField
        id={"Unicode"}
        title="Unicode"
        value={unicode}
        placeholder={"\\u0031"}
        onChange={(newValue) => {
          setNative(unicodesToNative(newValue));
        }}
      />
      <Form.TextField
        id={"Base64"}
        title="Base64"
        value={base64}
        placeholder={"MQ=="}
        onChange={(newValue) => {
          if (!isEmpty(newValue.trim())) {
            setNative(Buffer.from(newValue, "base64").toString("utf-8"));
          }
        }}
      />
      <Form.TextField
        id={"UTF-8"}
        title="UTF-8"
        value={utf8}
        placeholder={"\\xE4\\xBD\\xA0\\xE5\\xA5\\xBD"}
        info={"Letters and numbers will not be transcode to UTF-8"}
        onChange={(newValue) => {
          try {
            setNative(decodeURIComponent(newValue.replaceAll("\\x", "%")));
          } catch (e) {
            console.error(String(e));
          }
        }}
      />
      <Form.TextField
        id={"ASCII"}
        title="ASCII"
        value={ascii}
        placeholder={"Number"}
        info={"Only ASCII greater than 13 is supported"}
        onChange={(newValue) => {
          if (!isEmpty(newValue.trim()) && Number(newValue.trim()) > 13) {
            setNative(String.fromCharCode(Number(newValue.trim())));
          }
        }}
      />
      <Form.TextField
        id={"&#xXXXX;"}
        title="&#xXXXX;"
        value={chineseUtf8}
        placeholder={"&#xXXXX;"}
        info={"Chinese to &#xXXXX;"}
        onChange={(newValue) => {
          if (!isEmpty(newValue.trim())) {
            setNative(chineseUtf8ToNative(newValue));
          }
        }}
      />
      <Form.TextField
        id={"Encoded URL"}
        title="Encoded URL"
        value={url}
        placeholder={"https%3A%2F%2Fwww.raycast.com"}
        info={"URLs encoded with encodeURIComponent"}
        onChange={(newValue) => {
          if (!isEmpty(newValue.trim())) {
            setNative(decodeURIComponent(newValue));
          }
        }}
      />
    </Form>
  );
}
