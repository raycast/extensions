import test from "node:test";
import assert from "node:assert/strict";
import {
  KEYBOARD_ROWS,
  renderKeyboardLayoutMetadata,
  renderKeyboardLayoutMarkdown,
  renderKeyboardLayoutSvg,
  renderKeyboardLayoutText,
} from "../src/keyboard-layout.ts";
import type { ActionOrGroup } from "../src/types.ts";

const currentLevelItems: ActionOrGroup[] = [
  {
    id: "apps",
    key: "a",
    type: "group",
    label: "Apps",
    actions: [
      {
        id: "nested-browser",
        key: "b",
        type: "application",
        label: "Nested Browser",
        value: "/Applications/Safari.app",
      },
    ],
  },
  {
    id: "docs",
    key: "d",
    type: "url",
    label: "Docs & <Search>",
    value: "https://example.com",
  },
  {
    id: "section",
    key: "§",
    type: "command",
    label: "Help",
    value: "echo help",
  },
];

const caseSensitiveItems: ActionOrGroup[] = [
  {
    id: "apps",
    key: "a",
    type: "group",
    label: "Apps",
    actions: [],
  },
  {
    id: "admin",
    key: "A",
    type: "group",
    label: "Admin",
    actions: [],
  },
];

const numberSymbolItems: ActionOrGroup[] = [
  {
    id: "one",
    key: "1",
    type: "url",
    label: "One",
    value: "https://example.com/one",
  },
  {
    id: "bang",
    key: "!",
    type: "command",
    label: "Bang",
    value: "echo bang",
  },
];

test("renders only current-level bindings", () => {
  const svg = renderKeyboardLayoutSvg(currentLevelItems);

  assert.match(svg, /data-binding-key="a"/);
  assert.match(svg, /data-binding-key="d"/);
  assert.doesNotMatch(svg, /data-binding-key="b"/);
  assert.doesNotMatch(svg, /Nested Browser/);
});

test("does not render shortcut labels on keys", () => {
  const svg = renderKeyboardLayoutSvg(currentLevelItems);

  assert.doesNotMatch(svg, /data-label=/);
  assert.doesNotMatch(svg, />Apps</);
  assert.doesNotMatch(svg, />Docs &amp; &lt;Search&gt;</);
});

test("marks the selected qwerty key zone", () => {
  const svg = renderKeyboardLayoutSvg(currentLevelItems, { selectedKey: "d" });

  assert.match(
    svg,
    /data-key="d" data-binding-key="d" data-position="lower" data-state="selected"/,
  );
  assert.match(svg, /fill="#F59E0B"/);
});

test("does not render unsupported keys on the keyboard", () => {
  const svg = renderKeyboardLayoutSvg(currentLevelItems, { selectedKey: "§" });

  assert.doesNotMatch(svg, /Other keys/);
  assert.doesNotMatch(svg, /data-key="§"/);
  assert.doesNotMatch(svg, /data-binding-key="§"/);
});

test("renders an encoded svg markdown image", () => {
  const markdown = renderKeyboardLayoutMarkdown(currentLevelItems);
  const match = markdown.match(
    /^!\[Keyboard layout\]\(data:image\/svg\+xml;utf8,([^)]+)\)/,
  );

  assert.ok(match);
  const svg = decodeURIComponent(match[1]);
  assert.match(svg, /Leader key keyboard layout/);
  assert.match(svg, /width="420"/);
});

test("renders keyboard layout size presets", () => {
  const compactSvg = renderKeyboardLayoutSvg(currentLevelItems, {
    size: "compact",
  });
  const defaultSvg = renderKeyboardLayoutSvg(currentLevelItems);
  const largeSvg = renderKeyboardLayoutSvg(currentLevelItems, {
    size: "large",
  });

  assert.match(compactSvg, /width="360"/);
  assert.match(defaultSvg, /width="420"/);
  assert.match(largeSvg, /width="500"/);
});

test("renders a light appearance palette", () => {
  const svg = renderKeyboardLayoutSvg(currentLevelItems, {
    appearance: "light",
    selectedKey: "d",
  });

  assert.doesNotMatch(svg, /<rect width="420" height="\d+" rx="14" fill=/);
  assert.match(svg, /fill="#111827"/);
  assert.match(svg, /fill="#FFFFFF"/);
  assert.match(svg, /fill="#DBEAFE"/);
  assert.match(svg, /stroke="#FFFFFF" stroke-width="3" paint-order="stroke"/);
  assert.doesNotMatch(svg, /fill="#1E293B"/);
});

test("does not render an outer svg background", () => {
  const svg = renderKeyboardLayoutSvg(currentLevelItems);

  assert.doesNotMatch(svg, /<rect width="420" height="\d+" rx="14" fill=/);
});

test("renders the group title below the keyboard without a subtitle", () => {
  const svg = renderKeyboardLayoutSvg(currentLevelItems, { title: "Root" });

  assert.doesNotMatch(svg, /Bound keys in this group/);
  assert.match(svg, /height="212"/);
  assert.match(
    svg,
    /<g data-physical-key="`">.*<text x="20" y="196"[^>]*>Root<\/text>/,
  );
});

test("renders markdown image without tabular metadata", () => {
  const markdown = renderKeyboardLayoutMarkdown(currentLevelItems, {
    selectedKey: "d",
  });

  assert.match(markdown, /^!\[Keyboard layout\]/);
  assert.doesNotMatch(markdown, /## Information/);
  assert.doesNotMatch(markdown, /\| Field \| Value \|/);
  assert.doesNotMatch(markdown, /\| Name \|/);
});

test("returns selected item metadata rows", () => {
  const metadata = renderKeyboardLayoutMetadata(currentLevelItems, "d");

  assert.deepEqual(metadata, [
    { title: "Name", text: "Docs & <Search>" },
    { title: "Key", text: "d" },
    { title: "Type", text: "Url" },
    { title: "Value", text: "https://example.com" },
  ]);
});

test("returns group metadata rows", () => {
  const metadata = renderKeyboardLayoutMetadata(currentLevelItems, "a");

  assert.deepEqual(metadata, [
    { title: "Name", text: "Apps" },
    { title: "Key", text: "a" },
    { title: "Type", text: "Group" },
    { title: "Items", text: "1" },
  ]);
});

test("returns unsupported selected key metadata rows", () => {
  const metadata = renderKeyboardLayoutMetadata(currentLevelItems, "§");

  assert.deepEqual(metadata, [
    { title: "Name", text: "Help" },
    { title: "Key", text: "§" },
    { title: "Type", text: "Command" },
    { title: "Value", text: "echo help" },
  ]);
});

test("renders a text keyboard layout for forms", () => {
  const text = renderKeyboardLayoutText(currentLevelItems, {
    selectedKey: "a",
    title: "Root",
  });

  assert.match(text, /Root available keys/);
  assert.match(text, /\*a\*/);
  assert.match(text, /\[d\]/);
  assert.match(text, /Selected: Apps \(a\)/);
  assert.match(text, /Other used keys: §/);
});

test("exports each split key as an available key", () => {
  const selectableKeys = KEYBOARD_ROWS.flat();

  assert.ok(selectableKeys.includes("a"));
  assert.ok(selectableKeys.includes("A"));
  assert.ok(selectableKeys.includes("1"));
  assert.ok(selectableKeys.includes("!"));
  assert.ok(selectableKeys.includes("?"));
});

test("renders lowercase and uppercase bindings on one physical key", () => {
  const svg = renderKeyboardLayoutSvg(caseSensitiveItems);

  assert.match(
    svg,
    /data-physical-key="a".*data-key="A" data-binding-key="A" data-position="upper" data-state="bound".*data-key="a" data-binding-key="a" data-position="lower" data-state="bound"/,
  );
});

test("renders physical keys with triangular split zones", () => {
  const svg = renderKeyboardLayoutSvg(caseSensitiveItems);

  assert.match(svg, /<polygon points="[^"]+"/);
  assert.match(svg, /<line x1="5" y1="3" x2="31" y2="41" stroke="#334155"/);
  assert.doesNotMatch(svg, /height="18" rx="4"/);
});

test("marks only the uppercase key zone selected", () => {
  const svg = renderKeyboardLayoutSvg(caseSensitiveItems, {
    selectedKey: "A",
    size: "compact",
  });

  assert.match(
    svg,
    /data-key="A" data-binding-key="A" data-position="upper" data-state="selected"/,
  );
  assert.match(
    svg,
    /data-key="a" data-binding-key="a" data-position="lower" data-state="bound"/,
  );
});

test("renders number and symbol bindings on one physical key", () => {
  const svg = renderKeyboardLayoutSvg(numberSymbolItems, {
    selectedKey: "!",
    size: "large",
  });

  assert.match(
    svg,
    /data-physical-key="1".*data-key="!" data-binding-key="!" data-position="upper" data-state="selected".*data-key="1" data-binding-key="1" data-position="lower" data-state="bound"/,
  );
});
