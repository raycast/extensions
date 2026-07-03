import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useRef, useState } from "react";
import { CHARSETS, CODECS, type Charset, type Format, decode, encode, getCodec } from "./lib/text-codec";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function Command() {
  const [text, setText] = useState("");
  const [encoded, setEncoded] = useState("");
  const [format, setFormat] = useState<Format>("base64");
  const [charset, setCharset] = useState<Charset>("utf8");
  const [decodeError, setDecodeError] = useState<string | undefined>();
  // Which field the user last edited, so a parameter change recomputes in that
  // direction instead of always re-encoding (which would wipe an Encoded value
  // the user is mid-way through decoding).
  const [lastEdited, setLastEdited] = useState<"text" | "encoded">("text");

  // Refs mirror each field's live value so onChange can tell a genuine edit from
  // an "echo": Raycast re-fires onChange on focus/blur and when we set a value
  // programmatically. Those echoes carry an unchanged value, so we ignore them.
  const textRef = useRef("");
  const encodedRef = useRef("");

  function commitText(value: string) {
    textRef.current = value;
    setText(value);
  }

  function commitEncoded(value: string) {
    encodedRef.current = value;
    setEncoded(value);
  }

  // `text` and `encoded` mirror each other: editing Text re-encodes into Encoded,
  // while editing Encoded decodes back into Text.
  function applyEncode(source: string, fmt: Format, cs: Charset) {
    setDecodeError(undefined);
    commitEncoded(encode(source, fmt, cs));
  }

  function applyDecode(source: string, fmt: Format, cs: Charset) {
    if (!source) {
      commitText("");
      setDecodeError(undefined);
      return;
    }
    try {
      commitText(decode(source, fmt, cs));
      setDecodeError(undefined);
    } catch (error) {
      setDecodeError(messageOf(error));
    }
  }

  // Re-run the active direction after a format/charset change.
  function recompute(fmt: Format, cs: Charset) {
    if (lastEdited === "encoded") {
      applyDecode(encodedRef.current, fmt, cs);
    } else {
      applyEncode(textRef.current, fmt, cs);
    }
  }

  const codec = getCodec(format);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Encoded" icon={Icon.Code} content={encoded} />
          <Action.CopyToClipboard title="Copy Text" icon={Icon.Text} content={text} />
        </ActionPanel>
      }
    >
      <Form.Description text="Type in Text to encode, or paste into Encoded to decode. The result updates live." />
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Plain text to encode"
        value={text}
        onChange={(value) => {
          if (value === textRef.current) return; // ignore focus/blur/programmatic echoes
          commitText(value);
          setLastEdited("text");
          applyEncode(value, format, charset);
        }}
      />
      <Form.TextArea
        id="encoded"
        title="Encoded"
        placeholder={`${codec.label} payload to decode`}
        value={encoded}
        error={decodeError}
        onChange={(value) => {
          if (value === encodedRef.current) return; // ignore focus/blur/programmatic echoes
          commitEncoded(value);
          setLastEdited("encoded");
          applyDecode(value, format, charset);
        }}
      />
      <Form.Dropdown
        id="format"
        title="Format"
        info={codec.info}
        value={format}
        onChange={(value) => {
          const next = value as Format;
          setFormat(next);
          recompute(next, charset);
        }}
      >
        {CODECS.map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={c.label} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="charset"
        title="Text Encoding"
        info="How text is turned into bytes before formatting."
        value={charset}
        onChange={(value) => {
          const next = value as Charset;
          setCharset(next);
          recompute(format, next);
        }}
      >
        {CHARSETS.map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={c.label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
