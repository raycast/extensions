import { expect, test } from "bun:test";
import { spokenText } from "../src/spoken-text";

const examples = [
  ["Open [reader.ts](/Users/me/src/reader.ts).", "Open path reader.ts."],
  ["Read **this** and _that_.", "Read this and that."],
  [
    "[the **setup** guide](https://example.org/docs/start?q=1)",
    "the setup guide",
  ],
  ["See [Help][ref].\n\n[ref]: https://example.org/docs", "See Help."],
  [
    "Visit https://www.example.org/start?ref=reader#here.",
    "Visit example.org.",
  ],
  ["Read [](https://docs.example.com/guide).", "Read docs.example.com."],
  [
    "See example.com/docs or www.example.org/a.",
    "See example.com or example.org.",
  ],
  [
    "Open /Users/me/src/reader.ts and ../docs/manual.md.",
    "Open path reader.ts and path manual.md.",
  ],
  ["Open `~/My Notes/First Draft.md`.", "Open path First Draft.md."],
  [
    'Open "/Users/me/My Notes/file.txt" and C:\\Users\\me\\notes.txt.',
    "Open path file.txt and path notes.txt.",
  ],
  [
    "Read file:///Users/me/My%20Notes/First%20Draft.md.",
    "Read path First Draft.md.",
  ],
  [
    "See src/main.ts, docs/intro, and folder/sub/dir.",
    "See path main.ts, path intro, and path dir.",
  ],
  ["Open </Users/me/My Notes/Draft.md>.", "Open path Draft.md."],
  ["See [[My Notes/One|the first note]].", "See the first note."],
  [
    "3/4, 2026/11/25, TCP/IP, either/or, foo_bar, and 3 * 4.",
    "3/4, 2026/11/25, TCP/IP, either/or, foo_bar, and 3 * 4.",
  ],
  ["`a * b` and \\*literal\\*", "a * b and *literal*"],
  ["---\n\n***", ""],
];
for (const [input, expected] of examples) {
  test(input, () => expect(spokenText(input)).toBe(expected));
}
