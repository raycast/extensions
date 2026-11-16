// Runs the shipped Swift core (swift/Sources/ContactsCore.swift) through the test CLI.
import { execFileSync } from "node:child_process";
import path from "node:path";
import {
  buildDraft,
  selectSignatureBlock,
  type ContactDraft,
  type Detection,
} from "../src/core/parse";

const HELPER = path.join(__dirname, "..", ".test-build", "test-helper");

export const detect = (text: string): Detection =>
  JSON.parse(execFileSync(HELPER, ["detect"], { input: text }).toString());

export const ocr = (image: string): string =>
  JSON.parse(execFileSync(HELPER, ["ocr", image]).toString()).text;

export const vcard = (draft: object): string =>
  JSON.parse(
    execFileSync(HELPER, ["vcard"], {
      input: JSON.stringify(draft),
    }).toString(),
  ).vcard;

/** Same pipeline as the extension: signature block -> Swift detection -> parser. */
export function draft(text: string, defaultCallingCode = "43"): ContactDraft {
  const block = selectSignatureBlock(text);
  return buildDraft(block, detect(block), { defaultCallingCode });
}
