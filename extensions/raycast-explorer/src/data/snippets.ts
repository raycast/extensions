import { Icon, Image } from "@raycast/api";

type BaseSnippet = {
  id: string;
  text: string;
  name: string;
  keyword: string;
  hasMarkdown?: boolean;
};

type SnippetType = {
  type: "symbol" | "spelling" | "unicode" | "template";
};

type CodeType = {
  type: "code";
  language: string;
};

type Snippet = BaseSnippet & (SnippetType | CodeType);

const arrows: Snippet[] = [
  {
    id: "arrow-left",
    text: "←",
    name: "Arrow Left",
    keyword: "left",
    type: "symbol",
  },
  {
    id: "arrow-up",
    text: "↑",
    name: "Arrow Up",
    keyword: "up",
    type: "symbol",
  },
  {
    id: "arrow-right",
    text: "→",
    name: "Arrow Right",
    keyword: "right",
    type: "symbol",
  },
  {
    id: "arrow-down",
    text: "↓",
    name: "Arrow Down",
    keyword: "down",
    type: "symbol",
  },
  {
    id: "arrow-up-left",
    text: "↖",
    name: "Arrow Up Left",
    keyword: "upleft",
    type: "symbol",
  },
  {
    id: "arrow-up-right",
    text: "↗︎",
    name: "Arrow Up Right",
    keyword: "upright",
    type: "symbol",
  },
  {
    id: "arrow-down-left",
    text: "↙",
    name: "Arrow Down Left",
    keyword: "downleft",
    type: "symbol",
  },
  {
    id: "arrow-down-right",
    text: "↘",
    name: "Arrow Down Right",
    keyword: "downright",
    type: "symbol",
  },
  {
    id: "arrow-long-right",
    text: "⟶",
    name: "Arrow Long Right",
    keyword: "longright",
    type: "symbol",
  },
  {
    id: "arrow-long-left",
    text: "⟵",
    name: "Arrow Long Left",
    keyword: "longleft",
    type: "symbol",
  },
  {
    id: "arrow-left-hook",
    text: "↩",
    name: "Arrow Left Hook",
    keyword: "lefthook",
    type: "symbol",
  },
  {
    id: "arrow-right-hook",
    text: "↪",
    name: "Arrow Right Hook",
    keyword: "righthook",
    type: "symbol",
  },
  {
    id: "undo",
    text: "↺",
    name: "Undo",
    keyword: "undo",
    type: "symbol",
  },
  {
    id: "redo",
    text: "↻",
    name: "Redo",
    keyword: "redo",
    type: "symbol",
  },
];

const bulletsAndStars: Snippet[] = [
  {
    id: "middle-dot",
    text: "·",
    name: "Middle Dot",
    keyword: "dot",
    type: "symbol",
  },
  {
    id: "circle",
    text: "●",
    name: "Circle",
    keyword: "circle",
    type: "symbol",
  },
  {
    id: "star-filled",
    text: "★",
    name: "Star Filled",
    keyword: "star-filled",
    type: "symbol",
  },
  {
    id: "star-outline",
    text: "☆",
    name: "Star Outline",
    keyword: "star-outline",
    type: "symbol",
  },
  {
    id: "sparkle",
    text: "✦",
    name: "Sparkle",
    keyword: "sparkle",
    type: "symbol",
  },
  {
    id: "diamond",
    text: "❖",
    name: "Diamond",
    keyword: "diamond",
    type: "symbol",
  },
  {
    id: "reference-mark",
    text: "※",
    name: "Reference Mark",
    keyword: "reference-mark",
    type: "symbol",
  },
  {
    id: "asterism",
    text: "⁂",
    name: "Asterism",
    keyword: "asterism",
    type: "symbol",
  },
  {
    id: "three-dots",
    text: "⁖",
    name: "Three Dot Punctuation",
    keyword: "three-dots",
    type: "symbol",
  },
  {
    id: "four-dots",
    text: "⁘",
    name: "Four Dot Punctuation",
    keyword: "four-dots",
    type: "symbol",
  },
  {
    id: "five-dots",
    text: "⁙",
    name: "Five Dot Punctuation",
    keyword: "five-dots",
    type: "symbol",
  },
  {
    id: "dotted-cross",
    text: "⁜",
    name: "Dotted Cross",
    keyword: "dotted-cross",
    type: "symbol",
  },
  {
    id: "sun",
    text: "☀",
    name: "Sun",
    keyword: "sun",
    type: "symbol",
  },
];

const technical: Snippet[] = [
  {
    id: "command",
    text: "⌘",
    name: "Command",
    keyword: "cmd",
    type: "symbol",
  },
  {
    id: "caps-lock",
    text: "⇪",
    name: "Caps Lock",
    keyword: "caps",
    type: "symbol",
  },
  {
    id: "shift",
    text: "⇧",
    name: "Shift",
    keyword: "shift",
    type: "symbol",
  },
  {
    id: "option",
    text: "⌥",
    name: "Option",
    keyword: "opt",
    type: "symbol",
  },
  {
    id: "control",
    text: "⌃",
    name: "Control",
    keyword: "ctrl",
    type: "symbol",
  },
  {
    id: "backspace",
    text: "⌫",
    name: "Backspace",
    keyword: "backspace",
    type: "symbol",
  },
  {
    id: "escape",
    text: "⎋",
    name: "Escape",
    keyword: "esc",
    type: "symbol",
  },
  {
    id: "tab",
    text: "⇥",
    name: "Tab",
    keyword: "tab",
    type: "symbol",
  },
  {
    id: "return",
    text: "⏎",
    name: "Return",
    keyword: "return",
    type: "symbol",
  },
  {
    id: "apple",
    text: "",
    name: "Apple",
    keyword: "apple",
    type: "symbol",
  },
];

const currency: Snippet[] = [
  {
    id: "sterling",
    text: "£",
    name: "Sterling",
    keyword: "gbp",
    type: "symbol",
  },
  {
    id: "euro",
    text: "€",
    name: "Euro",
    keyword: "eur",
    type: "symbol",
  },
  {
    id: "yen",
    text: "¥",
    name: "Yen",
    keyword: "yen",
    type: "symbol",
  },
  {
    id: "dollar",
    text: "$",
    name: "Dollar",
    keyword: "usd",
    type: "symbol",
  },
  {
    id: "indian-rupee",
    text: "₹",
    name: "Indian Rupee",
    keyword: "inr",
    type: "symbol",
  },
  {
    id: "franc",
    text: "₣",
    name: "Franc",
    keyword: "fr",
    type: "symbol",
  },
  {
    id: "won",
    text: "₩",
    name: "Won",
    keyword: "krw",
    type: "symbol",
  },
  {
    id: "peso",
    text: "₱",
    name: "Peso",
    keyword: "php",
    type: "symbol",
  },
  {
    id: "naira",
    text: "₦",
    name: "Naira",
    keyword: "ngn",
    type: "symbol",
  },
  {
    id: "baht",
    text: "฿",
    name: "Baht",
    keyword: "thb",
    type: "symbol",
  },
  {
    id: "dong",
    text: "₫",
    name: "Dong",
    keyword: "vnd",
    type: "symbol",
  },
  {
    id: "bitcoin",
    text: "₿",
    name: "Bitcoin",
    keyword: "btc",
    type: "symbol",
  },
  {
    id: "ethereum",
    text: "Ξ",
    name: "Ethereum",
    keyword: "eth",
    type: "symbol",
  },
];

const maths: Snippet[] = [
  {
    id: "multiplication",
    text: "×",
    name: "Multiplication",
    keyword: "x",
    type: "symbol",
  },
  {
    id: "division",
    text: "÷",
    name: "Division",
    keyword: "division",
    type: "symbol",
  },
  {
    id: "plus-minus",
    text: "±",
    name: "Plus Minus",
    keyword: "+-",
    type: "symbol",
  },
  {
    id: "one-half",
    text: "½",
    name: "One Half",
    keyword: "1/2",
    type: "symbol",
  },
  {
    id: "one-third",
    text: "⅓",
    name: "One Third",
    keyword: "1/3",
    type: "symbol",
  },
  {
    id: "one-quarter",
    text: "¼",
    name: "One Quarter",
    keyword: "1/4",
    type: "symbol",
  },
  {
    id: "three-quarters",
    text: "¾",
    name: "Three Quarters",
    keyword: "3/4",
    type: "symbol",
  },
  {
    id: "five-sixths",
    text: "⅚",
    name: "Five Sixths",
    keyword: "5/6",
    type: "symbol",
  },
  {
    id: "one-fraction",
    text: "⅟",
    name: "One Fraction",
    keyword: "1/",
    type: "symbol",
  },
  {
    id: "seven-eighths",
    text: "⅞",
    name: "Seven Eighths",
    keyword: "7/8",
    type: "symbol",
  },
  {
    id: "one-eighth",
    text: "⅛",
    name: "One Eighth",
    keyword: "1/8",
    type: "symbol",
  },
  {
    id: "five-eighths",
    text: "⅝",
    name: "Five Eighths",
    keyword: "5/8",
    type: "symbol",
  },
  {
    id: "three-eighths",
    text: "⅜",
    name: "Three Eighths",
    keyword: "3/8",
    type: "symbol",
  },
  {
    id: "infinity",
    text: "∞",
    name: "Infinity",
    keyword: "infinity",
    type: "symbol",
  },
];

const symbols: Snippet[] = [
  {
    id: "registered",
    text: "®",
    name: "Registered",
    keyword: "registered",
    type: "symbol",
  },
  {
    id: "copyright",
    text: "©",
    name: "Copyright",
    keyword: "copyright",
    type: "symbol",
  },
  {
    id: "published",
    text: "℗",
    name: "Published",
    keyword: "published",
    type: "symbol",
  },
  {
    id: "trademark",
    text: "™",
    name: "Trademark",
    keyword: "tm",
    type: "symbol",
  },
  {
    id: "numero-sign",
    text: "№",
    name: "Numero Sign",
    keyword: "numero-sign",
    type: "symbol",
  },
  {
    id: "celsius",
    text: "℃",
    name: "Celsius",
    keyword: "celsius",
    type: "symbol",
  },
  {
    id: "fahrenheit",
    text: "℉",
    name: "Fahrenheit",
    keyword: "fahrenheit",
    type: "symbol",
  },
  {
    id: "check",
    text: "✓",
    name: "Check",
    keyword: "check",
    type: "symbol",
  },
  {
    id: "horizontal-ellipsis",
    text: "…",
    name: "Horizontal Ellipsis",
    keyword: "horizontal-ellipsis",
    type: "symbol",
  },
  {
    id: "triangle",
    text: "▲",
    name: "Triangle",
    keyword: "triangle",
    type: "symbol",
  },
];

const feedback: Snippet[] = [
  {
    name: "Feedback Thanks",
    id: "feedback-thanks",
    text: `Hi 👋

Thanks for taking the time to give us your feedback.

{cursor}`,
    keyword: "feedback-thanks",
    type: "template",
  },
  {
    name: "Feedback Resolved",
    id: "feedback-resolved",
    text: `Glad to know it is resolved. Feel free to reach out for any further clarifications.`,
    keyword: "feedback-resolved",
    type: "template",
  },
  {
    name: "LinkedIn Feedback",
    id: "feedback-lkdn",
    text: `Hey {cursor},

I'm thrilled about the opportunity. Unfortunately, I'm currently not available to accept new offers. However, I hope we can stay connected for future positions if you don't mind. Thank you again and hope to talk to you soon.`,
    keyword: "feedback-lkdn",
    type: "template",
  },
];

const coding: Snippet[] = [
  {
    name: "Console Log",
    id: "console-log",
    text: `console.log({cursor})`,
    keyword: "log",
    type: "code",
    language: "ts",
  },
  {
    name: "Raycast View Command",
    id: "raycast-view-command",
    text: `export default function Command() {
  return {cursor}
}`,
    keyword: "ray-vc",
    type: "code",
    language: "ts",
  },
  {
    name: "Export Functional Component",
    id: "export-functional-component",
    text: `export function Component() {
  return null
}`,
    keyword: "rfc",
    type: "code",
    language: "ts",
  },
  {
    name: "CSS Center Align",
    id: "css-center-align",
    text: `.selector {
  display: flex;
  align-items: center;
  justify-content: center;
}`,
    keyword: "css-ac",
    type: "code",
    language: "css",
  },
  {
    name: "Create and Open Folder in VSCode",
    id: "create-and-open-folder-vsc",
    text: "mkdir {clipboard} && code -r {clipboard}",
    keyword: "vscd-init",
    type: "code",
    language: "sh",
  },
  {
    name: "DOM Query Selector",
    id: "dom-query-selector",
    text: `document.querySelector({cursor})`,
    keyword: "qs",
    type: "code",
    language: "ts",
  },
];

const github: Snippet[] = [
  {
    id: "github-issue-template",
    name: "GitHub Issue Template",
    text: `## Expected Behavior

## Actual Behavior

## Steps to Reproduce the Problem

  1.
  1.
  1.

## Specifications

  - Version:
  - Platform:
  - Subsystem:
`,
    keyword: "gh-issue",
    type: "template",
    hasMarkdown: true,
  },
  {
    id: "github-pull-request-template",
    name: "GitHub Pull Request Template",
    text: `<!-- Thanks for opening a PR! Your contribution is much appreciated.-->

Fixes #

## Proposed Changes

  -
  -
  -
`,
    keyword: "gh-pr",
    type: "template",
    hasMarkdown: true,
  },
  {
    id: "github-table",
    name: "GitHub Table",
    text: `| Title1 | Title2 |
| ------- | ------- |
| Content1 | Content2 |
  `,
    keyword: "gh-table",
    type: "template",
    hasMarkdown: true,
  },
  {
    id: "github-details",
    name: "GitHub Details",
    text: `<details>
<summary>Title</summary>
{cursor}
</details>`,
    keyword: "gh-details",
    type: "template",
    hasMarkdown: true,
  },
  {
    id: "github-note",
    name: "GitHub Note",
    text: `> **Note**
> {cursor}`,
    keyword: "gh-note",
    type: "template",
    hasMarkdown: true,
  },
  {
    id: "github-warning",
    name: "GitHub Warning",
    text: `> **Warning**
> {cursor}`,
    keyword: "gh-warning",
    type: "template",
    hasMarkdown: true,
  },
];

const spelling: Snippet[] = [
  {
    id: "apparently",
    name: "Apparantly → Apparently",
    text: "Apparently",
    keyword: "Apparantly",
    type: "spelling",
  },
  {
    id: "calendar",
    name: "Calender → Calendar",
    text: "Calendar",
    keyword: "Calender",
    type: "spelling",
  },
  {
    id: "definitely",
    name: "Definately → Definitely",
    text: "Definitely",
    keyword: "Definately",
    type: "spelling",
  },
  {
    id: "environment",
    name: "Enviroment → Environment",
    text: "Environment",
    keyword: "Enviroment",
    type: "spelling",
  },
  {
    id: "fluorescent",
    name: "Florescent → Fluorescent",
    text: "Fluorescent",
    keyword: "Florescent",
    type: "spelling",
  },
  {
    id: "government",
    name: "Goverment → Government",
    text: "Government",
    keyword: "Goverment",
    type: "spelling",
  },
];

const unicodes: Snippet[] = [
  {
    id: "shrug",
    name: "Shrug",
    text: "¯\\_(ツ)_/¯",
    keyword: "shrug",
    type: "unicode",
  },
  {
    id: "happy",
    name: "Happy With It Unicode",
    text: "ʘ‿ʘ",
    keyword: "happy",
    type: "unicode",
  },
  {
    id: "cute",
    name: "Cute Unicode",
    text: "•‿•",
    keyword: "cute",
    type: "unicode",
  },
  {
    id: "tears-of-joy",
    name: "Tears Of Joy Unicode",
    text: "ಥ‿ಥ",
    keyword: "tears-of-joy",
    type: "unicode",
  },
  {
    id: "wink",
    name: "Wink Unicode",
    text: "◕‿↼",
    keyword: "wink",
    type: "unicode",
  },
  {
    id: "glasses-disapproval",
    name: "Glasses of Disapproval Unicode",
    text: "(-■_■)",
    keyword: "glasses-disapproval",
    type: "unicode",
  },
  {
    id: "meh",
    name: "Meh Unicode",
    text: "ヽ(。_°)ノ",
    keyword: "meh",
    type: "unicode",
  },
  {
    id: "serious-look",
    name: "Serious Lookg Unicode",
    text: "(ಠ_ಠ)",
    keyword: "serious-look",
    type: "unicode",
  },
  {
    id: "flipping-table",
    name: "Flipping Table Unicode",
    text: "(╯°□°)╯︵ ┻━┻",
    keyword: "flipping-table",
    type: "unicode",
  },
  {
    id: "putting-table",
    name: "Putting Table Back Unicode",
    text: "┳━┳ ヽ(ಠل͜ಠ)ﾉ",
    keyword: "putting-table",
    type: "unicode",
  },
  {
    id: "angry-cat",
    name: "Angry Cat Unicode",
    text: "(^._.^)ﾉ",
    keyword: "angry-cat",
    type: "unicode",
  },
  {
    id: "lenny",
    name: "Lenny Unicode",
    text: "( ͡° ͜ʖ ͡° ",
    keyword: "lenny",
    type: "unicode",
  },
  {
    id: "noggles",
    name: "Noggles",
    text: "⌐◨-◨",
    keyword: "noggles",
    type: "unicode",
  },
];

const date: Snippet[] = [
  {
    id: "current-date",
    name: "Current Date",
    text: "The date is {date}.",
    keyword: "date",
    type: "template",
  },
  {
    id: "current-time",
    name: "Current Time",
    text: "The current time is {time}.",
    keyword: "time",
    type: "template",
  },
  {
    id: "current-date-time",
    name: "Current Date and Time",
    text: "The current date and time is {datetime}.",
    keyword: "datetime",
    type: "template",
  },
  {
    id: "weekday",
    name: "Weekday",
    text: "Today is {day}.",
    keyword: "day",
    type: "template",
  },
  {
    id: "next-year",
    name: "1 Year from Today",
    text: "1 year from today will be {day +1y}.",
    keyword: "nextyear",
    type: "template",
  },
  {
    id: "day+4",
    name: "4 Days from Today",
    text: "4 days from today will be {day +4d}.",
    keyword: "day+4",
    type: "template",
  },
  {
    id: "week-number",
    name: "Week Number",
    text: 'This week number is {date "w"}.',
    keyword: "wn",
    type: "template",
  },
  {
    id: "next-week-number",
    name: "Next Week Number",
    text: 'Next week number is {date +7d "w"}.',
    keyword: "nwk",
    type: "template",
  },
];

const misc: Snippet[] = [
  {
    id: "email",
    name: "Email Address",
    text: "your@email.com",
    keyword: "email",
    type: "template",
  },
  {
    id: "address",
    name: "Address",
    text: "123 Quebec Road, Montreal, QC, H3A 2B2",
    keyword: "address",
    type: "template",
  },
  {
    id: "iban",
    name: "IBAN",
    text: "NL88INGB7356737620",
    keyword: "iban",
    type: "template",
  },
  {
    id: "vat",
    name: "VAT Number",
    text: "GB 943182327",
    keyword: "vat",
    type: "template",
  },
  {
    id: "crypto-wallet-address",
    name: "Crypto Wallet Address",
    text: "0x0000000000000000000000000000000000000000",
    keyword: "wa",
    type: "template",
  },
  {
    id: "cal-invite-link",
    name: "Cal.com Invite Link",
    text: "https://cal.com/username/30min",
    keyword: "cal",
    type: "template",
  },
  {
    id: "telegram-link",
    name: "Telegram Link",
    text: "https://t.me/yournickname",
    keyword: "tg",
    type: "template",
  },
  {
    id: "weekly-standup",
    name: "Weekly Standup Template",
    text: `Good morning ✨ 

*Last week:*
-  {cursor}

*Didn't do:*
-  

*This week:*
-  

*Blockers:*
-  

*Highlights:*
-  `,
    keyword: "standup",
    type: "template",
    hasMarkdown: true,
  },
];

type Category = {
  name: string;
  id: string;
  snippets: Snippet[];
  icon: Image.ImageLike;
};

export const categories: Category[] = [
  {
    name: "Symbols",
    id: "symbols",
    snippets: [...technical, ...bulletsAndStars, ...maths, ...symbols],
    icon: Icon.CommandSymbol,
  },
  {
    name: "Arrows",
    id: "arrows",
    snippets: arrows,
    icon: Icon.Shuffle,
  },
  {
    name: "Unicode",
    id: "unicode",
    snippets: unicodes,
    icon: Icon.Keyboard,
  },
  {
    name: "Date & Time",
    id: "dates",
    snippets: date,
    icon: Icon.Calendar,
  },
  {
    name: "Miscellaneous",
    id: "misc",
    snippets: misc,
    icon: Icon.Folder,
  },
  {
    name: "Spelling",
    id: "spelling",
    snippets: spelling,
    icon: Icon.Lowercase,
  },
  {
    name: "Currency",
    id: "currency",
    snippets: currency,
    icon: Icon.Coins,
  },
  {
    name: "Coding",
    id: "coding",
    snippets: coding,
    icon: Icon.CodeBlock,
  },
  {
    name: "Feedback",
    id: "feedback",
    snippets: feedback,
    icon: Icon.SpeechBubble,
  },
  {
    name: "GitHub",
    id: "github",
    snippets: github,
    icon: "github-32",
  },
];
