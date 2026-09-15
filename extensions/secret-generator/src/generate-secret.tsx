import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { randomBytes, randomUUID } from "node:crypto";
import { useState } from "react";
import { deliverSecret, randomString, URL_SAFE_CHARACTERS } from "./generator";

interface SecretFormValues {
  format: "base64url" | "hex" | "url-safe" | "uuid";
  length: string;
}

const formatLabels: Record<SecretFormValues["format"], string> = {
  base64url: "Base64URL secret",
  hex: "hex secret",
  "url-safe": "URL-safe secret",
  uuid: "UUID v4",
};

export default function GenerateSecret() {
  const [format, setFormat] = useState<SecretFormValues["format"]>("base64url");
  const [length, setLength] = useState("32");
  const parsedLength = Number.parseInt(length, 10);
  const bits =
    format === "uuid"
      ? 122
      : Math.floor(
          (Number.isInteger(parsedLength) ? parsedLength : 0) * (format === "hex" ? 4 : 6),
        );

  async function submit(values: SecretFormValues) {
    if (values.format === "uuid") {
      await deliverSecret(randomUUID(), formatLabels.uuid);
      return;
    }

    const requestedLength = Number.parseInt(values.length, 10);
    if (!Number.isInteger(requestedLength) || requestedLength < 8 || requestedLength > 512) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Use a whole-number length from 8 to 512",
      });
      return;
    }

    const secret =
      values.format === "hex"
        ? randomBytes(Math.ceil(requestedLength / 2))
            .toString("hex")
            .slice(0, requestedLength)
        : values.format === "base64url"
          ? randomBytes(Math.ceil((requestedLength * 3) / 4))
              .toString("base64url")
              .slice(0, requestedLength)
          : randomString(requestedLength, URL_SAFE_CHARACTERS);
    await deliverSecret(secret, `${requestedLength}-character ${formatLabels[values.format]}`);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Secret" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          format === "uuid"
            ? "A standards-compliant version 4 UUID with 122 random bits."
            : `About ${bits} bits of random entropy.`
        }
      />
      <Form.Dropdown
        id="format"
        title="Format"
        value={format}
        onChange={(value) => setFormat(value as SecretFormValues["format"])}
      >
        <Form.Dropdown.Item value="base64url" title="Base64URL" />
        <Form.Dropdown.Item value="hex" title="Hexadecimal" />
        <Form.Dropdown.Item value="url-safe" title="URL-safe characters" />
        <Form.Dropdown.Item value="uuid" title="UUID v4" />
      </Form.Dropdown>
      {format !== "uuid" && (
        <Form.TextField id="length" title="Length" value={length} onChange={setLength} />
      )}
    </Form>
  );
}
