import { exportKey, unwrapKeyWithPassphrase } from "@vaulted/crypto";

// Real PBKDF2 at up to 700k combined iterations; the default 5s timeout is too
// tight on a loaded CI runner.
const PBKDF2_TIMEOUT_MS = 30_000;

// Both vectors wrap the same raw key under the same passphrase. Each was
// generated once by running wrapKeyWithPassphrase from the npm-published
// tarball named in its key. Do not regenerate.
const RAW_KEY = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";
const PASSPHRASE = "correct horse battery staple";

const KNOWN_ANSWER_VECTORS = {
  // PBKDF2 at 600k: vaulted.fyi and every client on @vaulted/crypto >= 1.1.0.
  "@vaulted/crypto@1.1.0": {
    wrappedKey: "FkmBbZxZAFmODI-QMqUAiRLWXqHquakgchj0utTVWhTd-R904AA1Mw",
    salt: "IlUefgYGELHsFmxRF0HF-g",
  },
  // PBKDF2 at 100k: links created by older clients still in circulation.
  "@vaulted/crypto@1.0.0": {
    wrappedKey: "-ImnvxXgniZa6NQXKwPt0TE69EQZ2QHCO10pdw9lyzd051VScqhhIQ",
    salt: "QKuy-Aem8ZU2eWZJuM2afw",
  },
};

describe("PBKDF2 iteration interop", { timeout: PBKDF2_TIMEOUT_MS }, () => {
  it.each(Object.entries(KNOWN_ANSWER_VECTORS))(
    "unwraps a fragment produced by the published %s",
    async (_producer, { wrappedKey, salt }) => {
      const unwrapped = await unwrapKeyWithPassphrase(
        wrappedKey,
        salt,
        PASSPHRASE,
      );

      expect(await exportKey(unwrapped)).toBe(RAW_KEY);
    },
  );
});
