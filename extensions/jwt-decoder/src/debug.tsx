import { Action, ActionPanel, Clipboard, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  ALGORITHMS,
  type Algorithm,
  decode,
  hmacKeyBytes,
  hmacMinBytes,
  isHmac,
  isNone,
  looksLikeJwt,
  sign,
  verify,
  type VerifyResult,
} from "./utils/jwt-editor";
import { sampleKeysFor } from "./utils/jwt-samples";
import { deleteKeyProfile, listKeyProfiles, saveKeyProfile, type KeyProfile } from "./utils/key-profiles";

const SAMPLE = {
  jwt: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJpdGdnb29kMjQyMCIsIm5hbWUiOiJJbS1UYWUiLCJpYXQiOjE3ODQ3ODQwNTQsImV4cCI6MTk4NDc4NzY1NH0.uFbpo-o2EX_0cL5BW3Ypdcw5pgXJD-hRqRcypDo2xEs",
  header: JSON.stringify({ typ: "JWT", alg: "HS256" }, null, 2),
  payload: JSON.stringify({ sub: "itggood2420", name: "Im-Tae", iat: 1784784054, exp: 1984787654 }, null, 2),
  secret:
    "NTNv7j0TuYARvmNMmWXo6fKvM4o6nv/aUi9ryX38ZH+L1bkrnD1ObOQ8JAUmHCBq7Iy7otZcyAagBLHVKvvYaIpmMuxmARQ97jUVG16Jkpkp1wXOPsrF9zwew6TpczyHkHgX5EuLg2MeBuiT/qJACs1J0apruOOJCg/gOtkjB4c=",
};

type EditSource = "jwt" | "fields";

function statusText(result: VerifyResult, alg: string): string {
  if (result === "valid") return `🟢 Signature valid · ${alg}`;
  if (result === "invalid") return `🔴 Signature invalid · ${alg}`;
  if (result === "unsigned") return `🟡 Unsigned token · ${alg}`;
  return `🟡 Signature not checked (no key) · ${alg}`;
}

export default function JwtDebugger() {
  const [jwt, setJwt] = useState(SAMPLE.jwt);
  const [alg, setAlg] = useState<Algorithm>("HS256");
  const [header, setHeader] = useState(SAMPLE.header);
  const [payload, setPayload] = useState(SAMPLE.payload);
  const [secret, setSecret] = useState(SAMPLE.secret);
  const [secretBase64, setSecretBase64] = useState(true);
  const [privatePem, setPrivatePem] = useState("");
  const [publicPem, setPublicPem] = useState("");
  const [useJwks, setUseJwks] = useState(false);
  const [jwksUri, setJwksUri] = useState("");
  const [status, setStatus] = useState("");
  const [profiles, setProfiles] = useState<KeyProfile[]>([]);
  // Bumped by the "Sign / Re-sign" action to force a re-sign with the current key.
  const [signNonce, setSignNonce] = useState(0);

  // Which side the user last edited — used to drive one-directional recompute and avoid loops.
  const source = useRef<EditSource>("jwt");
  // The `signNonce` value at the last sign, so a self-triggered re-run doesn't sign again.
  const lastSignedNonce = useRef(-1);

  const reloadProfiles = () => listKeyProfiles().then(setProfiles);
  useEffect(() => {
    reloadProfiles();
  }, []);

  // Load a JWT from the clipboard on first open (falls back to the sample otherwise).
  useEffect(() => {
    (async () => {
      const clip = (await Clipboard.readText())?.trim();
      if (clip && looksLikeJwt(clip)) {
        source.current = "jwt";
        setJwt(clip);
      }
    })();
  }, []);

  // Keep the two sides in sync. Only the derived side is rewritten, never the field being edited.
  useEffect(() => {
    let cancelled = false;
    const keys = { secret, secretBase64, privatePem, publicPem, useJwks, jwksUri };

    (async () => {
      if (source.current === "jwt") {
        let decoded;
        try {
          decoded = decode(jwt);
        } catch {
          if (!cancelled) setStatus("🔴 Invalid JWT");
          return;
        }
        if (cancelled) return;
        setHeader(JSON.stringify(decoded.header, null, 2));
        setPayload(JSON.stringify(decoded.payload, null, 2));
        // Honor the token's own algorithm; never verify/re-sign under a stale dropdown value.
        const decodedAlg = decoded.header.alg;
        if (typeof decodedAlg !== "string") {
          setStatus('🔴 Header is missing an "alg"');
          return;
        }
        if (!(ALGORITHMS as readonly string[]).includes(decodedAlg)) {
          setStatus(`🔴 Unsupported algorithm: ${decodedAlg}`);
          return;
        }
        setAlg(decodedAlg as Algorithm);
        const result = await verify(jwt, decodedAlg as Algorithm, keys);
        if (!cancelled) setStatus(statusText(result, decodedAlg));
      } else {
        let headerObj: Record<string, unknown>;
        let payloadObj: Record<string, unknown>;
        try {
          headerObj = JSON.parse(header);
        } catch {
          if (!cancelled) setStatus("🔴 Invalid header JSON");
          return;
        }
        try {
          payloadObj = JSON.parse(payload);
        } catch {
          if (!cancelled) setStatus("🔴 Invalid payload JSON");
          return;
        }
        // The header's own `alg` is the signing contract — never re-sign under a stale dropdown value.
        const headerAlg = headerObj.alg;
        if (typeof headerAlg !== "string") {
          if (!cancelled) setStatus('🔴 Header is missing an "alg"');
          return;
        }
        if (!(ALGORITHMS as readonly string[]).includes(headerAlg)) {
          if (!cancelled) setStatus(`🔴 Unsupported algorithm: ${headerAlg}`);
          return;
        }
        const useAlg = headerAlg as Algorithm;
        // Guide the user instead of throwing a raw jose error when the signing key is missing/short.
        if (isHmac(useAlg)) {
          const have = hmacKeyBytes(secret, secretBase64);
          const need = hmacMinBytes(useAlg);
          if (have < need) {
            if (!cancelled) setStatus(`🟡 ${useAlg} needs a signing key of at least ${need} bytes (have ${have})`);
            return;
          }
        } else if (!isNone(useAlg) && !privatePem.trim()) {
          if (!cancelled) setStatus(`🟡 Enter a private key (PEM) to sign with ${useAlg}`);
          return;
        }
        // Re-sign only when the user actually requested it. Every sign-worthy action (field edit,
        // key/algorithm change, profile load, "Re-sign") bumps `signNonce`; our own setJwt/setAlg
        // below does not. Skipping an unchanged nonce stops randomized RSA-PSS/ECDSA signatures from
        // retriggering this effect and re-signing forever, yet still signs on a genuine request even
        // when the resulting header/payload are identical to a previous one.
        if (signNonce === lastSignedNonce.current) return;
        lastSignedNonce.current = signNonce;
        try {
          const token = await sign(headerObj, payloadObj, useAlg, keys);
          if (cancelled) return;
          setJwt(token);
          if (useAlg !== alg) setAlg(useAlg); // keep the dropdown mirroring the header
          const result = await verify(token, useAlg, keys);
          if (!cancelled) setStatus(statusText(result, useAlg));
        } catch (error) {
          if (!cancelled) setStatus(`🔴 ${error instanceof Error ? error.message : "Signing failed"}`);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jwt, alg, header, payload, secret, secretBase64, privatePem, publicPem, useJwks, jwksUri, signNonce]);

  // A user action that should (re-)sign: drive the fields→jwt direction and bump the nonce so the
  // effect signs even when the header/payload happen to match a previous sign (see the effect guard).
  function markSignRequest() {
    source.current = "fields";
    setSignNonce((n) => n + 1);
  }

  // Changing a signing key (HMAC secret, base64 flag, or private key) re-signs the token.
  function onSignKeyChange<T>(setter: (value: T) => void) {
    return (value: T) => {
      markSignRequest();
      setter(value);
    };
  }

  // The public key only verifies — you can't sign with it — so changing it re-verifies instead.
  function onVerifyKeyChange<T>(setter: (value: T) => void) {
    return (value: T) => {
      source.current = "jwt";
      setter(value);
    };
  }

  // Explicitly (re-)sign the current header/payload with the current key.
  function resign() {
    markSignRequest();
  }

  function loadProfile(profile: KeyProfile) {
    // Re-sign only when the profile actually has a signing key; otherwise (JWKS or
    // public-key-only verification profiles) verify the current token instead.
    const canSign =
      !profile.useJwks && (isHmac(profile.alg) ? profile.secret.length > 0 : profile.privatePem.trim().length > 0);
    if (canSign) {
      markSignRequest(); // re-sign even if this profile's inputs match a previous sign
    } else {
      source.current = "jwt";
    }
    setAlg(profile.alg as Algorithm);
    setSecret(profile.secret);
    setSecretBase64(profile.secretBase64);
    setPrivatePem(profile.privatePem);
    setPublicPem(profile.publicPem);
    setUseJwks(profile.useJwks);
    setJwksUri(profile.jwksUri);
    try {
      const parsed = JSON.parse(header);
      setHeader(JSON.stringify({ ...parsed, alg: profile.alg }, null, 2));
    } catch {
      // leave header as-is if it isn't valid JSON right now
    }
  }

  function onAlgChange(next: string) {
    markSignRequest();
    setAlg(next as Algorithm);
    // Load example key material for the new algorithm so it stays a working sample.
    const sample = sampleKeysFor(next);
    setSecret(sample.secret);
    setSecretBase64(sample.secretBase64);
    setPrivatePem(sample.privatePem);
    setPublicPem(sample.publicPem);
    setUseJwks(false);
    setJwksUri("");
    // Reflect the algorithm into the header for consistency.
    try {
      const parsed = JSON.parse(header);
      setHeader(JSON.stringify({ ...parsed, alg: next }, null, 2));
    } catch {
      // leave header as-is if it isn't valid JSON right now
    }
  }

  function reset() {
    source.current = "jwt";
    setAlg("HS256");
    setSecret(SAMPLE.secret);
    setSecretBase64(true);
    setPrivatePem("");
    setPublicPem("");
    setUseJwks(false);
    setJwksUri("");
    setJwt(SAMPLE.jwt);
  }

  async function loadFromClipboard() {
    const clip = (await Clipboard.readText())?.trim();
    if (clip) {
      source.current = "jwt";
      setJwt(clip);
    }
  }

  const currentKeys = { alg, secret, secretBase64, privatePem, publicPem, useJwks, jwksUri };

  return (
    <Form
      navigationTitle={status || "JWT Debugger"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JWT" content={jwt} icon={Icon.Clipboard} />
          <Action.CopyToClipboard title="Copy Header" content={header} />
          <Action.CopyToClipboard title="Copy Payload" content={payload} />
          <Action title="Sign / Re-Sign with Current Key" icon={Icon.Key} onAction={resign} />
          <ActionPanel.Section title="Key Profiles">
            <Action.Push
              title="Save Key Profile"
              icon={Icon.SaveDocument}
              target={<SaveProfileForm keys={currentKeys} onSaved={reloadProfiles} />}
            />
            {profiles.length > 0 && (
              <ActionPanel.Submenu title="Load Key Profile" icon={Icon.Download}>
                {profiles.map((profile) => (
                  <Action
                    key={profile.id}
                    title={`${profile.name} (${profile.alg})`}
                    onAction={() => loadProfile(profile)}
                  />
                ))}
              </ActionPanel.Submenu>
            )}
            {profiles.length > 0 && (
              <ActionPanel.Submenu title="Delete Key Profile" icon={Icon.Trash}>
                {profiles.map((profile) => (
                  <Action
                    key={profile.id}
                    title={profile.name}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      await deleteKeyProfile(profile.id);
                      await showToast({ style: Toast.Style.Success, title: "Key profile deleted" });
                      reloadProfiles();
                    }}
                  />
                ))}
              </ActionPanel.Submenu>
            )}
          </ActionPanel.Section>
          <Action title="Load from Clipboard" icon={Icon.Download} onAction={loadFromClipboard} />
          <Action title="Reset to Sample" icon={Icon.ArrowCounterClockwise} onAction={reset} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="alg" title="Algorithm" value={alg} onChange={onAlgChange}>
        {ALGORITHMS.map((a) => (
          <Form.Dropdown.Item key={a} value={a} title={a} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="jwt"
        title="JWT"
        value={jwt}
        onChange={(value) => {
          source.current = "jwt";
          setJwt(value);
        }}
      />
      <Form.TextArea
        id="header"
        title="Header"
        value={header}
        onChange={(value) => {
          markSignRequest();
          setHeader(value);
        }}
      />
      <Form.TextArea
        id="payload"
        title="Payload"
        value={payload}
        onChange={(value) => {
          markSignRequest();
          setPayload(value);
        }}
      />
      {isNone(alg) ? null : isHmac(alg) ? (
        <>
          <Form.Checkbox
            id="secretBase64"
            label="Secret is Base64 encoded"
            value={secretBase64}
            onChange={onSignKeyChange(setSecretBase64)}
          />
          <Form.TextArea
            id="secret"
            title="Signing Key"
            info="The HMAC secret. Changing it re-signs the token."
            value={secret}
            onChange={onSignKeyChange(setSecret)}
          />
        </>
      ) : (
        <>
          <Form.Checkbox
            id="useJwks"
            label="Use JWKS Endpoint"
            value={useJwks}
            onChange={onVerifyKeyChange(setUseJwks)}
          />
          {useJwks ? (
            <Form.TextField
              id="jwksUri"
              title="JWKS Endpoint"
              placeholder="https://example.com/.well-known/jwks.json"
              info="Public keys are fetched from this URL to verify the token."
              value={jwksUri}
              onChange={onVerifyKeyChange(setJwksUri)}
            />
          ) : (
            <>
              <Form.TextArea
                id="privatePem"
                title="Private Key (PEM)"
                placeholder="-----BEGIN PRIVATE KEY-----"
                info="Used to sign the token. Changing it re-signs."
                value={privatePem}
                onChange={onSignKeyChange(setPrivatePem)}
              />
              <Form.TextArea
                id="publicPem"
                title="Public Key (PEM)"
                placeholder="-----BEGIN PUBLIC KEY-----"
                info="Used to verify the current token's signature."
                value={publicPem}
                onChange={onVerifyKeyChange(setPublicPem)}
              />
            </>
          )}
        </>
      )}
    </Form>
  );
}

function SaveProfileForm({ keys, onSaved }: { keys: Omit<KeyProfile, "id" | "name">; onSaved: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string }) {
    if (!values.name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a profile name" });
      return;
    }
    await saveKeyProfile({ ...keys, name: values.name.trim() });
    await showToast({ style: Toast.Style.Success, title: "Key profile saved" });
    onSaved();
    pop();
  }

  return (
    <Form
      navigationTitle="Save Key Profile"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Profile" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Profile Name" placeholder={`e.g. Prod ${keys.alg}`} />
      <Form.Description title="Algorithm" text={keys.alg} />
    </Form>
  );
}
