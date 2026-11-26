import { environment } from "@raycast/api";
import { existsSync } from "fs";
import { join } from "path";
import type { Address, Email, EmailContent, Mailbox } from "./jmap";

// Made-up mail for store screenshots. Development builds only, switched on by creating
// a file named "demo" in the extension's support folder. The saved API token is left alone.
export function isDemo(): boolean {
  return environment.isDevelopment && existsSync(join(environment.supportPath, "demo"));
}

export const DEMO_TOKEN = "demo";

// Made-up companies get a made-up favicon from assets/demo. People keep their initials avatar.
export function demoFavicon(domain: string): string | undefined {
  const path = `demo/${domain}.png`;
  return existsSync(join(environment.assetsPath, path)) ? path : undefined;
}

export const demoMailboxes: Mailbox[] = [
  { id: "inbox", name: "Inbox", role: "inbox", sortOrder: 1 },
  { id: "archive", name: "Archive", role: "archive", sortOrder: 2 },
  { id: "drafts", name: "Drafts", role: "drafts", sortOrder: 3 },
  { id: "sent", name: "Sent", role: "sent", sortOrder: 4 },
  { id: "receipts", name: "Receipts", role: null, sortOrder: 10 },
  { id: "side-projects", name: "Side Projects", role: null, sortOrder: 11 },
  { id: "junk", name: "Spam", role: "junk", sortOrder: 20 },
  { id: "trash", name: "Trash", role: "trash", sortOrder: 21 },
];

type DemoEmail = {
  subject: string;
  from: Address;
  minutesAgo: number;
  folder?: string;
  unread?: boolean;
  attachments?: { name: string; type: string; size: number }[];
  body: string;
  links?: { title: string; url: string }[];
};

const ME: Address = { name: "Alex Morgan", email: "alex@mail.example" };

const DEMO_EMAILS: DemoEmail[] = [
  {
    subject: "Your Moonbase Bank login code",
    from: { name: "Moonbase Bank", email: "security@moonbase.example" },
    minutesAgo: 2,
    unread: true,
    body: "Hi Alex,\n\nYour login code is **481923**.\n\nThis code expires in 10 minutes, or when the moon sets, whichever comes first.\n\nIf you didn't try to log in, someone is very interested in your 4 cents of interest.",
  },
  {
    subject: "Sign in to Sourdough Club",
    from: { name: "Sourdough Club", email: "hello@sourdough.example" },
    minutesAgo: 9,
    unread: true,
    body: "Your starter, **Doughnald Trunk**, is waiting for you.\n\n[Sign in to Sourdough Club](https://sourdough.example/login/magic-7f3a)\n\nThis link works once. Like a good loaf, it doesn't keep.",
    links: [
      { title: "Sign in to Sourdough Club", url: "https://sourdough.example/login/magic-7f3a" },
      { title: "Unsubscribe", url: "https://sourdough.example/unsubscribe" },
    ],
  },
  {
    subject: "Re: The office fridge situation",
    from: { name: "Priya (People Ops)", email: "priya@paperclip.example" },
    minutesAgo: 34,
    unread: true,
    body: 'Team,\n\nThe yogurt labelled **"DO NOT EAT (seriously)"** has achieved sentience and is now requesting a desk.\n\nWe\'re clearing the fridge Friday at 5pm. Anything left behind will be adopted by the yogurt.\n\nPriya',
  },
  {
    subject: "Agenda: meeting to plan the meeting about meetings",
    from: { name: "Dana Whitfield", email: "dana@paperclip.example" },
    minutesAgo: 75,
    attachments: [{ name: "agenda-v7-FINAL-final.pdf", type: "application/pdf", size: 248_000 }],
    body: "Hi all,\n\nAgenda attached. Key items:\n\n1. Review last week's meeting\n2. Decide if this meeting should have been an email\n3. Schedule follow-up meeting\n\nSnacks provided. Attendance mandatory. Cameras optional, enthusiasm required.\n\nDana",
  },
  {
    subject: "Your rubber duck has shipped 🦆",
    from: { name: "Quack Supply Co.", email: "orders@quacksupply.example" },
    minutesAgo: 180,
    body: "Good news! Your **Senior Debugging Duck (XL)** is on its way.\n\nIt has been briefed on your codebase and is already disappointed.\n\nEstimated arrival: Thursday",
    links: [{ title: "Track your duck", url: "https://quacksupply.example/track/QK-0042" }],
  },
  {
    subject: "Verify it's you",
    from: { name: "Cloudpaw", email: "no-reply@cloudpaw.example" },
    minutesAgo: 240,
    body: "Someone (hopefully you) is signing in to Cloudpaw from **a Mac in a coffee shop**.\n\nYour verification code is 905174.\n\nIf this wasn't you, please tell the cat.",
  },
  {
    subject: "Lunch? 🌮",
    from: { name: "Sam Rivera", email: "sam.rivera@mail.example" },
    minutesAgo: 60 * 6,
    body: "Tacos at 12:30? The truck that may or may not have a health certificate is back.\n\nSam",
  },
  {
    subject: "Invoice #0042 for one (1) very large wheel of cheese",
    from: { name: "Big Cheese Wholesale", email: "billing@bigcheese.example" },
    minutesAgo: 60 * 26,
    attachments: [{ name: "invoice-0042.pdf", type: "application/pdf", size: 61_000 }],
    body: "Thanks for your order!\n\n| Item | Qty | Price |\n|---|---|---|\n| Wheel of gouda, 40 kg | 1 | €389.00 |\n| Forklift rental | 1 | €120.00 |\n\nPayment due in 30 days. The cheese will not wait that long.",
  },
  {
    subject: "Your houseplant misses you",
    from: { name: "Fernly", email: "fern@fernly.example" },
    minutesAgo: 60 * 30,
    body: "Hi Alex,\n\nGerald the fiddle-leaf fig hasn't been watered in **11 days**. He's not angry. He's just disappointed.\n\nWater Gerald today?",
  },
  {
    subject: "This week in procrastination (read later)",
    from: { name: "The Later Letter", email: "issue@laterletter.example" },
    minutesAgo: 60 * 50,
    body: "In this issue:\n\n- 7 productivity tips you'll save and never open\n- Why your to-do list is a historical document\n- Reader mail: \"I'll reply to this tomorrow\"",
  },
  {
    subject: "Re: Can you help me unmute the video call",
    from: { name: "Grandma", email: "grandma.morgan@mail.example" },
    minutesAgo: 60 * 72,
    body: "Never mind dear, I figured it out. I was holding the phone upside down.\n\nAlso I've joined a band.\n\nLove, Grandma",
  },
  {
    subject: "Congratulations! You've won a free yacht*",
    from: { name: "Definitely Real Prizes", email: "winner@totallylegit.example" },
    minutesAgo: 60 * 96,
    folder: "junk",
    body: "*Yacht is a drawing of a yacht.",
  },
];

export const demoEmails: Email[] = DEMO_EMAILS.map((demo, index) => ({
  id: `demo-${index + 1}`,
  subject: demo.subject,
  from: demo.from,
  to: [ME],
  receivedAt: new Date(Date.now() - demo.minutesAgo * 60 * 1000),
  preview: demo.body
    .replace(/[*#|[\]]|\(https?:[^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 200),
  unread: Boolean(demo.unread),
  mailboxIds: { [demo.folder ?? "inbox"]: true },
  attachments: (demo.attachments ?? []).map((a, i) => ({ blobId: `demo-${index + 1}-${i}`, ...a })),
  webUrl: "https://app.fastmail.com/mail/Inbox/",
}));

export function demoContent(id: string): EmailContent | undefined {
  const demo = DEMO_EMAILS[Number(id.replace("demo-", "")) - 1];
  return demo && { body: demo.body, text: demo.body.replace(/\*/g, ""), links: demo.links ?? [] };
}

export function demoList(folder: string, query: string): Email[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return demoEmails.filter((email) => {
    const inFolder =
      folder === "all" || (folder === "inbox" && query) ? !email.mailboxIds.junk : email.mailboxIds[folder];
    const text = `${email.subject} ${email.from?.name} ${email.from?.email} ${email.preview}`.toLowerCase();
    return inFolder && words.every((word) => text.includes(word.replace(/^\w+:/, "")));
  });
}
