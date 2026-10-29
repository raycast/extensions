import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { useMemo } from "react";
import { errorMessage } from "../lib/errors";
import { codeBlock } from "../lib/markdown";
import { formatRelative } from "../lib/timestamp";
import {
  claimsStatus,
  ClaimsStatus,
  decodeToken,
  DecodedJwe,
  DecodedJws,
  DecryptOutcome,
  prettyJson,
  TokenMode,
} from "../lib/tokens";
import { DecryptForm } from "./JweForms";
import { SignForm, VerifyForm } from "./JwsForms";
import { MODE_LABEL, TokenInputForm } from "./TokenCommand";

const STATUS_TAG: Record<ClaimsStatus, { text: string; color: Color }> = {
  valid: { text: "Not Expired", color: Color.Green },
  expired: { text: "Expired", color: Color.Red },
  "not-yet-valid": { text: "Not Yet Valid", color: Color.Orange },
  "no-expiry": { text: "No Expiry", color: Color.SecondaryText },
};

const TIME_CLAIMS = ["iat", "nbf", "exp"] as const;
const TEXT_CLAIMS = ["iss", "sub", "aud", "jti"] as const;
const HEADER_FIELDS = ["typ", "cty", "kid", "zip", "jku", "x5u", "x5t"] as const;

function claimTime(value: unknown): string {
  if (typeof value !== "number") return String(value);
  const date = new Date(value * 1000);
  return `${date.toLocaleString()} (${formatRelative(date)})`;
}

/** `isRoot` hides the navigation title when the detail is the command's first screen (Store guideline). */
export function TokenDetail({ token, mode, isRoot }: { token: string; mode: TokenMode; isRoot?: boolean }) {
  const result = useMemo(() => {
    try {
      return { decoded: decodeToken(token) };
    } catch (error) {
      return { error: errorMessage(error) };
    }
  }, [token]);

  if ("error" in result) {
    return (
      <Detail
        markdown={`# Invalid Token\n\n${result.error}\n\n${codeBlock(token)}`}
        actions={
          <ActionPanel>
            <Action.Push title="Enter Another Token" icon={Icon.Pencil} target={<TokenInputForm mode={mode} />} />
          </ActionPanel>
        }
      />
    );
  }

  return result.decoded.kind === "jws" ? (
    <JwsDetail token={token} decoded={result.decoded} mode={mode === "jwe" ? "jwt" : mode} isRoot={isRoot} />
  ) : (
    <JweDetail token={token} decoded={result.decoded} isRoot={isRoot} />
  );
}

function HeaderMetadata({ header }: { header: Record<string, unknown> }) {
  return (
    <>
      {HEADER_FIELDS.filter((f) => header[f] !== undefined).map((f) => (
        <Detail.Metadata.Label key={f} title={f} text={String(header[f])} />
      ))}
    </>
  );
}

function JwsDetail({
  token,
  decoded,
  mode,
  isRoot,
}: {
  token: string;
  decoded: DecodedJws;
  mode: "jwt" | "jws";
  isRoot?: boolean;
}) {
  const { header, claims, payloadJson, payloadText, signature } = decoded;
  const label = claims && header.typ !== undefined && /jwt/i.test(String(header.typ)) ? "JWT" : MODE_LABEL[mode];
  const payload = payloadJson !== undefined ? prettyJson(payloadJson) : payloadText;
  const status = claims ? claimsStatus(claims) : undefined;

  const markdown = [
    `## Header`,
    codeBlock(prettyJson(header), "json"),
    `## Payload`,
    codeBlock(payload, payloadJson !== undefined ? "json" : ""),
    `## Signature`,
    signature ? codeBlock(signature) : "_Unsecured token (no signature)_",
  ].join("\n\n");

  return (
    <Detail
      navigationTitle={isRoot ? undefined : `Decoded ${label}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={label} />
          <Detail.Metadata.Label title="Algorithm" text={String(header.alg)} />
          <HeaderMetadata header={header} />
          <Detail.Metadata.Label title="Signature" text="Not verified (↵ Verify Signature)" />
          {claims && status && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Expiry (claims only, unverified)">
                <Detail.Metadata.TagList.Item text={STATUS_TAG[status].text} color={STATUS_TAG[status].color} />
              </Detail.Metadata.TagList>
              {TEXT_CLAIMS.filter((c) => claims[c] !== undefined).map((c) => (
                <Detail.Metadata.Label
                  key={c}
                  title={c}
                  text={Array.isArray(claims[c]) ? (claims[c] as string[]).join(", ") : String(claims[c])}
                />
              ))}
              {TIME_CLAIMS.filter((c) => claims[c] !== undefined).map((c) => (
                <Detail.Metadata.Label key={c} title={c} text={claimTime(claims[c])} />
              ))}
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Verify Signature"
            icon={Icon.CheckCircle}
            target={<VerifyForm token={token} mode={mode} />}
          />
          <Action.CopyToClipboard
            title="Copy Payload"
            content={payload}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action.CopyToClipboard
            title="Copy Header"
            content={prettyJson(header)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
          />
          <Action.CopyToClipboard title="Copy Token" content={token} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action.Push
            title="Edit and Re-Sign"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<SignForm mode={mode} initialHeader={header} initialPayload={payload} />}
          />
          <Action.Push
            title="Decode Another Token"
            icon={Icon.Eye}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<TokenInputForm mode={mode} />}
          />
        </ActionPanel>
      }
    />
  );
}

function JweDetail({ token, decoded, isRoot }: { token: string; decoded: DecodedJwe; isRoot?: boolean }) {
  const { header } = decoded;
  const parts: [string, string][] = [
    ["Encrypted Key", decoded.encryptedKey || "(empty: direct encryption)"],
    ["Initialization Vector", decoded.iv],
    ["Ciphertext", decoded.ciphertext],
    ["Authentication Tag", decoded.tag],
  ];
  const markdown = [
    `## Protected Header`,
    codeBlock(prettyJson(header), "json"),
    `## Payload`,
    "_Encrypted. Use **Decrypt** (↵) to reveal it._",
    ...parts.flatMap(([title, value]) => [`### ${title}`, codeBlock(value)]),
  ].join("\n\n");

  return (
    <Detail
      navigationTitle={isRoot ? undefined : "JWE"}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text="JWE" />
          <Detail.Metadata.Label title="Key Management (alg)" text={String(header.alg)} />
          <Detail.Metadata.Label title="Content Encryption (enc)" text={String(header.enc)} />
          <HeaderMetadata header={header} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push title="Decrypt" icon={Icon.LockUnlocked} target={<DecryptForm token={token} />} />
          <Action.CopyToClipboard
            title="Copy Header"
            content={prettyJson(header)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
          />
          <Action.CopyToClipboard title="Copy Token" content={token} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action.Push
            title="Inspect Another Token"
            icon={Icon.Eye}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<TokenInputForm mode="jwe" />}
          />
        </ActionPanel>
      }
    />
  );
}

export function DecryptedDetail({ outcome }: { outcome: DecryptOutcome }) {
  const isJson = outcome.json !== undefined;
  const plaintext = isJson ? prettyJson(outcome.json) : outcome.plaintext;
  const markdown = [
    `## Protected Header`,
    codeBlock(prettyJson(outcome.header), "json"),
    `## Plaintext`,
    codeBlock(plaintext, isJson ? "json" : ""),
    outcome.nestedToken ? "_The plaintext is a nested token. Press ↵ to decode it._" : "",
  ].join("\n\n");

  return (
    <Detail
      navigationTitle="Decrypted JWE"
      markdown={markdown}
      actions={
        <ActionPanel>
          {outcome.nestedToken && (
            <Action.Push
              title="Decode Nested Token"
              icon={Icon.Eye}
              target={<TokenDetail token={outcome.nestedToken} mode="jwt" />}
            />
          )}
          <Action.CopyToClipboard title="Copy Plaintext" content={plaintext} />
          <Action.CopyToClipboard
            title="Copy Header"
            content={prettyJson(outcome.header)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
          />
        </ActionPanel>
      }
    />
  );
}
