import { quillDeltaToMarkdown } from "./quillDeltaToMarkdown";

const slackDelta = {
  ops: [
    { attributes: { bold: true }, insert: "Bo**ld" },
    { insert: " " },
    { attributes: { italic: true }, insert: "ita_lic" },
    { insert: " " },
    { attributes: { underline: true }, insert: "underline" },
    { insert: " " },
    { attributes: { strike: true }, insert: "strike" },
    { insert: " " },
    { attributes: { code: true }, insert: "co`de``" },
    { insert: "\n\n" },
    { attributes: { link: "http://foo.com" }, insert: "foo.com" },
    { insert: " " },
    { attributes: { link: "https://foo.com" }, insert: "l[i](n)k" },
    { insert: " " },
    { attributes: { unlink: true }, insert: "foo.com" },
    { insert: "\n\none" },
    { attributes: { list: "ordered" }, insert: "\n" },
    { insert: "two" },
    { attributes: { indent: 1, list: "ordered" }, insert: "\n" },
    { insert: "three" },
    { attributes: { indent: 2, list: "bullet" }, insert: "\n" },
    { insert: "four" },
    { attributes: { indent: 2, list: "bullet" }, insert: "\n" },
    { insert: "quote" },
    { attributes: { blockquote: true }, insert: "\n" },
    { insert: "\nWith " },
    { attributes: { code: true }, insert: "code" },
    { insert: " \n\nmore co`de" },
    { attributes: { "code-block": true }, insert: "\n" },
    { insert: "  if" },
    { attributes: { "code-block": true }, insert: "\n" },
    { insert: "    else" },
    { attributes: { "code-block": true }, insert: "\n" },
    { insert: "````````" },
    { attributes: { "code-block": true }, insert: "\n" },
  ],
};

const expected = `**Bo\\*\\*ld** _ita\\_lic_ <u>underline</u> ~~strike~~ \`\`\` co\`de\`\` \`\`\`

[foo.com](http://foo.com) [l\\[i\\](n)k](https://foo.com) foo.com

1. one
    1. two
        - three
        - four
> quote

With \`code\`${" "}

\`\`\`\`\`\`\`\`\`
more co${"`"}de
  if
    else
\`\`\`\`\`\`\`\`
\`\`\`\`\`\`\`\`\``;

const lineStartDelta = { ops: [{ insert: "- not a list\n1. not ordered\n+ also not a list\nnormal line" }] };
const lineStartExpected = `\\- not a list\n1\\. not ordered\n\\+ also not a list\nnormal line`;
const lineStartResult = quillDeltaToMarkdown(lineStartDelta);
if (lineStartResult !== lineStartExpected) {
  console.log("FAIL (line-start escaping)");
  console.log("  expected:", JSON.stringify(lineStartExpected));
  console.log("  got:     ", JSON.stringify(lineStartResult));
  process.exit(1);
}

const result = quillDeltaToMarkdown(slackDelta);

if (result === expected) {
  console.log("PASS");
} else {
  console.log("FAIL");
  console.log("\n--- Expected ---");
  console.log(expected);
  console.log("\n--- Got ---");
  console.log(result);

  const expectedLines = expected.split("\n");
  const resultLines = result.split("\n");
  const maxLines = Math.max(expectedLines.length, resultLines.length);
  console.log("\n--- Diff (line by line) ---");
  for (let i = 0; i < maxLines; i++) {
    const e = expectedLines[i] ?? "<missing>";
    const r = resultLines[i] ?? "<missing>";
    if (e !== r) {
      console.log(`Line ${i + 1}:`);
      console.log(`  expected: ${JSON.stringify(e)}`);
      console.log(`  got:      ${JSON.stringify(r)}`);
    }
  }
}
