import * as jose from "jose";

const additionalClaims: Record<string, string> = {
  exp: "Expiration time (seconds since Unix epoch)",
  nbf: "Not valid before (seconds since Unix epoch)",
  iat: "Issued at (seconds since Unix epoch)",
  iss: "Issuer (who created and signed this token)",
  sub: "Subject (whom the token refers to)",
  aud: "Audience (who or what the token is intended for)",
  jti: "JWT ID (unique identifier for this token)",
  typ: "Type of token",
  azp: "Authorized party (the party to which this token was issued)",
  alg: "Signature or encryption algorithm",
  jku: "JSON Web Key Set URL",
  jwk: "JSON Web Key Set (embedded)",
  kid: "Key ID",
  x5u: "X.509 Certificate URL",
  x5t: "X.509 Fingerprint (SHA-1)",
  "x5t#S256": "X.509 Fingerprint (SHA-256)",
  cty: "Content type",
  crit: "Extensions or claims that MUST be processed or verified",
  enc: "Encryption algorithm",
  zip: "Compression algorithm",
  kty: "Key type",
  use: 'Intended use of key: "sig" or "enc" (other values accepted)',
  key_ops: "Intended operations for this key",
  sid: "Session ID (String identifier for a Session)",
  updated_at: "Last modification timestamp",
  at_hash: "Access Token hash value",
  c_hash: "Authorization Code hash value",
  s_hash: "State hash value",
  nonce: "Unique value associating request to token",
  auth_time: "Time when authentication occurred",
  amr: "Authentication methods array",
  acr: "Authentication context class",
} as const;

export interface TokenItem {
  key: string;
  value: string | number;
  row?: string[];
}

export function ListFromObject(decrypted: jose.JWTPayload, claims: Array<string[]> | undefined) {
  return Object.keys(decrypted).map((key) => {
    if (!claims) {
      return { key: key, value: decrypted[key] } as TokenItem;
    }
    const row = Object.keys(additionalClaims).includes(key)
      ? [key, additionalClaims[key]]
      : claims.find((claim) => key === claim[0]);
    return { key, value: decrypted[key], row } as TokenItem;
  });
}
