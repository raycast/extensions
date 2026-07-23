import { Action, ActionPanel, Clipboard, Form, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  ALGORITHMS,
  type Algorithm,
  decode,
  isHmac,
  isNone,
  looksLikeJwt,
  sign,
  verify,
  type VerifyResult,
} from "./lib/jwt";

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

export default function EditJwt() {
  const [jwt, setJwt] = useState(SAMPLE.jwt);
  const [alg, setAlg] = useState<Algorithm>("HS256");
  const [header, setHeader] = useState(SAMPLE.header);
  const [payload, setPayload] = useState(SAMPLE.payload);
  const [secret, setSecret] = useState(SAMPLE.secret);
  const [secretBase64, setSecretBase64] = useState(true);
  const [privatePem, setPrivatePem] = useState("");
  const [publicPem, setPublicPem] = useState("");
  const [status, setStatus] = useState("");
  // Bumped by the "Sign / Re-sign" action to force a re-sign with the current key.
  const [signNonce, setSignNonce] = useState(0);

  // Which side the user last edited — used to drive one-directional recompute and avoid loops.
  const source = useRef<EditSource>("jwt");

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
    const keys = { secret, secretBase64, privatePem, publicPem };

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
        try {
          const token = await sign(headerObj, payloadObj, alg, keys);
          if (cancelled) return;
          setJwt(token);
          const result = await verify(token, alg, keys);
          if (!cancelled) setStatus(statusText(result, alg));
        } catch (error) {
          if (!cancelled) setStatus(`🔴 ${error instanceof Error ? error.message : "Signing failed"}`);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jwt, alg, header, payload, secret, secretBase64, privatePem, publicPem, signNonce]);

  // Entering a key means "verify the current token with this key", not "re-sign".
  function onKeyChange<T>(setter: (value: T) => void) {
    return (value: T) => {
      source.current = "jwt";
      setter(value);
    };
  }

  // Explicitly (re-)sign the current header/payload with the current key.
  function resign() {
    source.current = "fields";
    setSignNonce((n) => n + 1);
  }

  function onAlgChange(next: string) {
    source.current = "fields";
    setAlg(next as Algorithm);
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
    setJwt(SAMPLE.jwt);
  }

  async function loadFromClipboard() {
    const clip = (await Clipboard.readText())?.trim();
    if (clip) {
      source.current = "jwt";
      setJwt(clip);
    }
  }

  return (
    <Form
      navigationTitle={status || "JWT Debugger"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JWT" content={jwt} icon={Icon.Clipboard} />
          <Action.CopyToClipboard title="Copy Header" content={header} />
          <Action.CopyToClipboard title="Copy Payload" content={payload} />
          <Action title="Sign / Re-Sign with Current Key" icon={Icon.Key} onAction={resign} />
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
          source.current = "fields";
          setHeader(value);
        }}
      />
      <Form.TextArea
        id="payload"
        title="Payload"
        value={payload}
        onChange={(value) => {
          source.current = "fields";
          setPayload(value);
        }}
      />
      {isNone(alg) ? null : isHmac(alg) ? (
        <>
          <Form.Checkbox
            id="secretBase64"
            label="Secret is Base64 encoded"
            value={secretBase64}
            onChange={onKeyChange(setSecretBase64)}
          />
          <Form.TextArea
            id="secret"
            title="Signing Key"
            info="Entering a key verifies the current token. Use “Sign / Re-Sign” to sign with it."
            value={secret}
            onChange={onKeyChange(setSecret)}
          />
        </>
      ) : (
        <>
          <Form.TextArea
            id="privatePem"
            title="Private Key (PEM)"
            placeholder="-----BEGIN PRIVATE KEY-----"
            info="Used by “Sign / Re-Sign” to sign the token."
            value={privatePem}
            onChange={onKeyChange(setPrivatePem)}
          />
          <Form.TextArea
            id="publicPem"
            title="Public Key (PEM)"
            placeholder="-----BEGIN PUBLIC KEY-----"
            info="Used to verify the current token's signature."
            value={publicPem}
            onChange={onKeyChange(setPublicPem)}
          />
        </>
      )}
    </Form>
  );
}
