import { getPreferenceValues, PreferenceValues } from "@raycast/api";
import type { Tiktoken, TiktokenEncoding } from "tiktoken";
import { get_encoding, init } from "tiktoken/init";
import wasm from "tiktoken/tiktoken_bg.wasm";

const encoders = new Map<TiktokenEncoding, Tiktoken>();
let tiktokenInitPromise: Promise<void> | undefined;

export async function encode(str: string) {
  const { encoding } = getPreferenceValues<PreferenceValues>();
  const encoder = await getEncoder(encoding);

  return {
    tokens: Array.from(encoder.encode(str)),
    encoding,
  };
}

export async function decode(list: number[]) {
  const { encoding } = getPreferenceValues<PreferenceValues>();
  const encoder = await getEncoder(encoding);

  return {
    text: new TextDecoder().decode(encoder.decode(new Uint32Array(list))),
    encoding,
  };
}

async function getEncoder(encoding: TiktokenEncoding) {
  await initTiktoken();

  const existingEncoder = encoders.get(encoding);

  if (existingEncoder) {
    return existingEncoder;
  }

  const encoder = get_encoding(encoding);
  encoders.set(encoding, encoder);

  return encoder;
}

function initTiktoken() {
  // check if tiktoken is already initialized
  if (tiktokenInitPromise) {
    return tiktokenInitPromise;
  }

  tiktokenInitPromise = init((imports) => WebAssembly.instantiate(wasm, imports)).catch((error) => {
    tiktokenInitPromise = undefined;
    throw error;
  });

  return tiktokenInitPromise;
}
