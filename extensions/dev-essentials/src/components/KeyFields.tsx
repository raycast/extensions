import { Action, Form, Icon } from "@raycast/api";
import { SECRET_ENCODINGS, SecretEncoding } from "../lib/tokens";

/** True when the key input is a raw shared secret rather than PEM / JWK / JWKS / URL. */
export function isRawSecret(key: string): boolean {
  const k = key.trim();
  return !k.startsWith("{") && !k.includes("-----BEGIN") && !/^https?:\/\//i.test(k);
}

export function SecretEncodingDropdown(props: { value: SecretEncoding; onChange: (value: SecretEncoding) => void }) {
  return (
    <Form.Dropdown
      id="encoding"
      title="Secret Encoding"
      value={props.value}
      onChange={(v) => props.onChange(v as SecretEncoding)}
    >
      {SECRET_ENCODINGS.map((e) => (
        <Form.Dropdown.Item key={e.value} value={e.value} title={e.title} />
      ))}
    </Form.Dropdown>
  );
}

export function CompanionKey({ companion }: { companion?: { title: string; value: string } }) {
  return companion ? <Form.Description title={companion.title} text={companion.value} /> : null;
}

export function CopyCompanionAction({ companion }: { companion?: { title: string; value: string } }) {
  return companion ? (
    <Action.CopyToClipboard
      title={`Copy ${companion.title.replace(/\s*\(.*\)$/, "")}`}
      icon={Icon.Key}
      content={companion.value}
      shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
    />
  ) : null;
}
