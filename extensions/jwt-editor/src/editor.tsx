import { useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  LaunchProps,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";

import { decodeJWT } from "./jwt";
import type { DecodedJWT } from "./jwt";

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

function getExpiry(exp?: number): { text: string; color: Color } {
  if (exp === undefined) return { text: "No expiry", color: Color.SecondaryText };
  const expired = Date.now() / 1000 >= exp;
  return {
    text: expired ? `Expired — ${formatDate(exp)}` : `Unexpired until ${formatDate(exp)} (signature not verified)`,
    color: expired ? Color.Red : Color.Green,
  };
}

function JWTDetail({ decoded, token }: { decoded: DecodedJWT; token: string }) {
  const expiry = getExpiry(decoded.payload.exp);

  const markdown = `
Signature verification is not performed.\n\n## Header
\`\`\`json
${JSON.stringify(decoded.header, null, 2)}
\`\`\`

## Payload
\`\`\`json
${JSON.stringify(decoded.payload, null, 2)}
\`\`\`

## Signature
\`\`\`
${decoded.signature}
\`\`\`
`;

  return (
    <Detail
      navigationTitle="JWT Decoded"
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action
              title="Copy Payload"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(JSON.stringify(decoded.payload, null, 2), { concealed: true });
                await showToast({ style: Toast.Style.Success, title: "Payload copied" });
              }}
            />
            <Action
              title="Copy Header"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
              onAction={async () => {
                await Clipboard.copy(JSON.stringify(decoded.header, null, 2), { concealed: true });
                await showToast({ style: Toast.Style.Success, title: "Header copied" });
              }}
            />
            <Action
              title="Copy Token"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              onAction={async () => {
                await Clipboard.copy(token, { concealed: true });
                await showToast({ style: Toast.Style.Success, title: "Token copied" });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Algorithm" text={decoded.header.alg} />
          {decoded.header.typ && <Detail.Metadata.Label title="Type" text={decoded.header.typ} />}
          {decoded.header.kid && <Detail.Metadata.Label title="Key ID" text={decoded.header.kid} />}
          <Detail.Metadata.Separator />
          {decoded.payload.sub !== undefined && (
            <Detail.Metadata.Label title="Subject" text={String(decoded.payload.sub)} />
          )}
          {decoded.payload.iss && <Detail.Metadata.Label title="Issuer" text={String(decoded.payload.iss)} />}
          {decoded.payload.aud && (
            <Detail.Metadata.Label
              title="Audience"
              text={Array.isArray(decoded.payload.aud) ? decoded.payload.aud.join(", ") : String(decoded.payload.aud)}
            />
          )}
          {decoded.payload.jti && <Detail.Metadata.Label title="JWT ID" text={decoded.payload.jti} />}
          <Detail.Metadata.Separator />
          {decoded.payload.iat !== undefined && (
            <Detail.Metadata.Label title="Issued At" text={formatDate(decoded.payload.iat)} />
          )}
          {decoded.payload.nbf !== undefined && (
            <Detail.Metadata.Label title="Not Before" text={formatDate(decoded.payload.nbf)} />
          )}
          <Detail.Metadata.Label title="Expiry" text={{ value: expiry.text, color: expiry.color }} />
        </Detail.Metadata>
      }
    />
  );
}

function JWTForm({ initialJWT = "" }: { initialJWT?: string }) {
  const { push } = useNavigation();
  const [jwt, setJWT] = useState(initialJWT);
  const [error, setError] = useState<string | undefined>();

  const decode = (token: string) => {
    try {
      const decoded = decodeJWT(token);
      setError(undefined);
      push(<JWTDetail decoded={decoded} token={token.trim()} />);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Cannot decode token";
      setError(message);
      showToast({ style: Toast.Style.Failure, title: "Invalid JWT", message });
    }
  };

  return (
    <Form
      navigationTitle="JWT Editor"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Decode" icon={Icon.Eye} onSubmit={({ jwt: token }) => decode(token)} />
          <Action
            title="Paste from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={async () => {
              const text = await Clipboard.readText();
              if (text) {
                setJWT(text.trim());
                setError(undefined);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="jwt"
        title="JWT Token"
        placeholder="Paste your JWT token here..."
        value={jwt}
        onChange={(val) => {
          setJWT(val);
          setError(undefined);
        }}
        error={error}
      />
    </Form>
  );
}

export default function Command(props: LaunchProps<{ launchContext?: { jwt?: string } }>) {
  return <JWTForm initialJWT={props.launchContext?.jwt ?? ""} />;
}
