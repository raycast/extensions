/**
 * Blip's protobuf schema, extracted from BlipKit 1.2.8.
 * Credential fields (auth token, push token) are deliberately removed from the
 * schema so they are never decoded into memory.
 */
import Long from "long";
import protobuf from "protobufjs";
import schemaJson from "../generated/blip-schema.json";

export const EXPECTED_STATE_VERSION = 1;

let root: protobuf.Root | undefined;

function getRoot(): protobuf.Root {
  if (!root) {
    // Blip uses 64-bit ids (e.g. the state id). Bundlers can hide protobufjs's optional `long`
    // dependency, which would silently round them to doubles, so wire it up explicitly.
    protobuf.util.Long = Long;
    protobuf.configure();
    root = protobuf.Root.fromJSON(schemaJson as protobuf.INamespace);
    root.resolveAll();
  }
  return root;
}

function messageType(name: string): protobuf.Type {
  return getRoot().lookupType(name);
}

const toObjectOptions: protobuf.IConversionOptions = {
  longs: String,
  enums: Number,
  bytes: Buffer,
  defaults: true,
  arrays: true,
  objects: true,
};

export function decode<T>(typeName: string, bytes: Uint8Array): T {
  const type = messageType(typeName);
  return type.toObject(type.decode(bytes), toObjectOptions) as T;
}

export function encode(typeName: string, payload: Record<string, unknown>): Uint8Array {
  const type = messageType(typeName);
  // fromObject (not verify) accepts 64-bit ids as decimal strings, which is how we carry them.
  return type.encode(type.fromObject(payload)).finish();
}

/** Wraps an event in google.protobuf.Any, the envelope Blip's Dispatch expects. */
export function encodeEvent(eventName: string, payload: Record<string, unknown>): Uint8Array {
  return encode("google.protobuf.Any", {
    type_url: `type.googleapis.com/${eventName}`,
    value: encode(eventName, payload),
  });
}
