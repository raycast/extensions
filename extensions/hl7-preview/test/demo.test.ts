import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { decodeBuffer, parseHL7 } from "../src/hl7";
import { messageMarkdown } from "../src/render";

// The demo files feed the Store screenshots; each must parse to one message with no "Unknown" segment.
it.each(readdirSync(join(__dirname, "../demo")))("renders demo/%s", (name) => {
  const messages = parseHL7(decodeBuffer(readFileSync(join(__dirname, "../demo", name))));
  expect(messages).toHaveLength(1);
  const md = messageMarkdown(messages[0]);
  expect(md).not.toContain("Unknown segment");
});
