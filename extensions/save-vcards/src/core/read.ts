// Text or image in, contact draft out.
import { getPreferenceValues } from "@raycast/api";
import { detect, recognizeText } from "../native";
import { log, logPrivate } from "./log";
import { buildDraft, selectSignatureBlock, type ContactDraft } from "./parse";

export async function readContact(input: string): Promise<ContactDraft> {
  const block = selectSignatureBlock(input);
  if (block.length !== input.length) log("read", `signature block: ${block.length} of ${input.length} chars`);
  const draft = buildDraft(block, await detect(block), {
    defaultCallingCode: getPreferenceValues<Preferences>().defaultCountry,
  });
  log("read", "parsed", {
    name: !!(draft.givenName || draft.familyName),
    company: !!draft.organization,
    title: !!draft.jobTitle,
    emails: draft.emails.length,
    phones: draft.phones.length,
    address: !!draft.address,
  });
  logPrivate("read", "draft", draft);
  return draft;
}

export async function readImage(file: string): Promise<string> {
  const text = await recognizeText(file);
  log("read", `recognized ${text.length} chars from image`);
  return text;
}
