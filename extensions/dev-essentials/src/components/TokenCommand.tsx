import { Action, ActionPanel, Clipboard, Form, Icon, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { cleanToken, looksLikeToken, TokenMode } from "../lib/tokens";
import { DecryptForm, EncryptForm } from "./JweForms";
import { SignForm, VerifyForm } from "./JwsForms";
import { TokenDetail } from "./TokenDetail";

export const MODE_LABEL: Record<TokenMode, string> = { jwt: "JWT", jws: "JWS", jwe: "JWE" };

/** Entry point shared by the jwt / jws / jwe commands. */
export function TokenCommand({ mode, token }: { mode: TokenMode; token?: string }) {
  const cleaned = cleanToken(token ?? "");
  return cleaned ? <TokenDetail token={cleaned} mode={mode} isRoot /> : <TokenHome mode={mode} />;
}

async function readClipboardToken(): Promise<string | undefined> {
  const text = await Clipboard.readText();
  return text && looksLikeToken(text) ? cleanToken(text) : undefined;
}

function TokenHome({ mode }: { mode: TokenMode }) {
  const { data: clipboardToken, isLoading } = usePromise(readClipboardToken);
  const label = MODE_LABEL[mode];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter actions">
      {clipboardToken && (
        <List.Section title="Clipboard">
          <List.Item
            icon={Icon.Clipboard}
            title={mode === "jwe" ? "Inspect Token from Clipboard" : "Decode Token from Clipboard"}
            subtitle={`${clipboardToken.slice(0, 40)}…`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Decode"
                  icon={Icon.Eye}
                  target={<TokenDetail token={clipboardToken} mode={mode} />}
                />
                {mode === "jwe" ? (
                  <Action.Push
                    title="Decrypt"
                    icon={Icon.LockUnlocked}
                    target={<DecryptForm token={clipboardToken} />}
                  />
                ) : (
                  <Action.Push
                    title="Verify Signature"
                    icon={Icon.CheckCircle}
                    target={<VerifyForm token={clipboardToken} mode={mode} />}
                  />
                )}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title={label}>
        <List.Item
          icon={Icon.Eye}
          title={mode === "jwe" ? "Inspect Token" : "Decode Token"}
          subtitle={mode === "jwe" ? "Show the protected header and parts" : "Show header, payload and claims"}
          actions={
            <ActionPanel>
              <Action.Push title="Open" target={<TokenInputForm mode={mode} />} />
            </ActionPanel>
          }
        />
        {mode === "jwe" ? (
          <>
            <List.Item
              icon={Icon.LockUnlocked}
              title="Decrypt Token"
              subtitle="Secret, private key (PEM), JWK or JWKS"
              actions={
                <ActionPanel>
                  <Action.Push title="Open" target={<DecryptForm token={clipboardToken} />} />
                </ActionPanel>
              }
            />
            <List.Item
              icon={Icon.Lock}
              title="Encrypt Payload"
              subtitle="Create a compact JWE"
              actions={
                <ActionPanel>
                  <Action.Push title="Open" target={<EncryptForm />} />
                </ActionPanel>
              }
            />
          </>
        ) : (
          <>
            <List.Item
              icon={Icon.CheckCircle}
              title="Verify Signature"
              subtitle="Secret, public key / certificate (PEM), JWK, JWKS or JWKS URL"
              actions={
                <ActionPanel>
                  <Action.Push title="Open" target={<VerifyForm token={clipboardToken} mode={mode} />} />
                </ActionPanel>
              }
            />
            <List.Item
              icon={Icon.Pencil}
              title={`Encode and Sign ${label}`}
              subtitle="HMAC, RSA, RSA-PSS, ECDSA or EdDSA"
              actions={
                <ActionPanel>
                  <Action.Push title="Open" target={<SignForm mode={mode} />} />
                </ActionPanel>
              }
            />
          </>
        )}
      </List.Section>
    </List>
  );
}

export function TokenInputForm({ mode }: { mode: TokenMode }) {
  const { push } = useNavigation();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    readClipboardToken().then((t) => t && setToken((current) => current || t));
  }, []);

  return (
    <Form
      navigationTitle={`Decode ${MODE_LABEL[mode]}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Decode"
            icon={Icon.Eye}
            onSubmit={() => {
              const cleaned = cleanToken(token);
              if (!cleaned) return setError("Paste a token");
              push(<TokenDetail token={cleaned} mode={mode} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="token"
        title="Token"
        placeholder="eyJhbGciOi…"
        value={token}
        error={error}
        onChange={(value) => {
          setToken(value);
          setError(undefined);
        }}
      />
    </Form>
  );
}
