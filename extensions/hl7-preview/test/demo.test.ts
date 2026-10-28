import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { it } from "node:test";
import { expect } from "./expect.ts";
import { decodeBuffer, parseHL7 } from "../src/hl7.ts";
import { messageMarkdown } from "../src/render.ts";

// The demo files feed the Store screenshots; each must parse to one message with no "Unknown" segment.
const demo = join(import.meta.dirname, "../demo");
for (const name of readdirSync(demo)) {
  it(`renders demo/${name}`, () => {
    const messages = parseHL7(decodeBuffer(readFileSync(join(demo, name))));
    expect(messages).toHaveLength(1);
    expect(messageMarkdown(messages[0])).not.toContain("Unknown segment");
  });
}
