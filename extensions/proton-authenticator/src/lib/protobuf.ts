import * as protobuf from "protobufjs";
import { DecryptedAuthenticatorEntry } from "../types";

// Inline protobuf schema matching authenticator_entry.proto
const protoSchema = `
syntax = "proto3";

message AuthenticatorEntryContentTotp {
  string uri = 1;
}

message AuthenticatorEntryContentSteam {
  string secret = 1;
}

message AuthenticatorEntryContent {
  oneof content {
    AuthenticatorEntryContentTotp totp = 1;
    AuthenticatorEntryContentSteam steam = 2;
  }
}

message AuthenticatorEntryMetadata {
  string name = 1;
  string note = 2;
  string id = 3;
}

message AuthenticatorEntry {
  AuthenticatorEntryMetadata metadata = 1;
  AuthenticatorEntryContent content = 2;
}
`;

let AuthenticatorEntryType: protobuf.Type | null = null;

async function getAuthenticatorEntryType(): Promise<protobuf.Type> {
  if (AuthenticatorEntryType) {
    return AuthenticatorEntryType;
  }

  const root = protobuf.parse(protoSchema).root;
  AuthenticatorEntryType = root.lookupType("AuthenticatorEntry");
  return AuthenticatorEntryType;
}

export async function decodeAuthenticatorEntry(buffer: Buffer): Promise<DecryptedAuthenticatorEntry> {
  const type = await getAuthenticatorEntryType();
  const message = type.decode(buffer);
  const obj = type.toObject(message, {
    longs: String,
    enums: String,
    bytes: String,
    defaults: true,
    oneofs: true,
  });

  return {
    metadata: {
      name: obj.metadata?.name || "",
      note: obj.metadata?.note || "",
      id: obj.metadata?.id || "",
    },
    content: {
      totp: obj.content?.totp ? { uri: obj.content.totp.uri } : undefined,
      steam: obj.content?.steam ? { secret: obj.content.steam.secret } : undefined,
    },
  };
}
