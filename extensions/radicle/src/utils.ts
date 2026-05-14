import bs58 from "bs58";

export function formatNodeId(id: string): string {
  const parsedId = parseNodeId(id);

  if (parsedId) {
    return `${parsedId.prefix}${truncateId(parsedId.pubkey)}`;
  }

  return id;
}

function parseNodeId(nid: string): { prefix: string; pubkey: string } | undefined {
  const match = /^(did:key:)?(z[a-zA-Z0-9]+)$/.exec(nid);
  if (match) {
    const hex = bs58.decode(match[2].substring(1));
    // This checks also that the first 2 bytes are equal
    // to the ed25519 public key type used.
    if (!(hex.byteLength === 34 && hex[0] === 0xed && hex[1] === 1)) {
      return undefined;
    }

    return { prefix: match[1] || "did:key:", pubkey: match[2] };
  }

  return undefined;
}

function truncateId(pubkey: string): string {
  return `${pubkey.substring(0, 6)}…${pubkey.slice(-6)}`;
}

const pluralRules = {
  Delegate: "Delegates",
} as const;

export function pluralize(singular: keyof typeof pluralRules, count: number): string {
  return count === 1 ? singular : pluralRules[singular];
}
