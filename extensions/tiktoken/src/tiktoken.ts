import { getPreferenceValues } from "@raycast/api";
import { Tiktoken } from "js-tiktoken/lite";
import type { TiktokenBPE } from "js-tiktoken/lite";

type EncodingName = "gpt2" | "r50k_base" | "p50k_base" | "p50k_edit" | "cl100k_base" | "o200k_base";
type Preferences = { encoding: EncodingName };

const encoders = new Map<EncodingName, Tiktoken>();

export function encode(str: string) {
  const { encoding } = getPreferenceValues<Preferences>();
  const encoder = getEncoder(encoding);

  return {
    tokens: encoder.encode(str),
    encoding,
  };
}

export function decode(list: number[]) {
  const { encoding } = getPreferenceValues<Preferences>();
  const encoder = getEncoder(encoding);

  return {
    text: encoder.decode(list),
    encoding,
  };
}

function getEncoder(encoding: EncodingName) {
  const existingEncoder = encoders.get(encoding);

  if (existingEncoder) {
    return existingEncoder;
  }

  let ranks: TiktokenBPE;
  switch (encoding) {
    case "gpt2":
      ranks = require("js-tiktoken/ranks/gpt2");
      break;
    case "r50k_base":
      ranks = require("js-tiktoken/ranks/r50k_base");
      break;
    case "p50k_base":
      ranks = require("js-tiktoken/ranks/p50k_base");
      break;
    case "p50k_edit":
      ranks = require("js-tiktoken/ranks/p50k_edit");
      break;
    case "cl100k_base":
      ranks = require("js-tiktoken/ranks/cl100k_base");
      break;
    case "o200k_base":
      ranks = require("js-tiktoken/ranks/o200k_base");
      break;
  }

  const encoder = new Tiktoken(ranks);
  encoders.set(encoding, encoder);

  return encoder;
}
