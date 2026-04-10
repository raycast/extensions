import { Email, Folder } from "./types";

export const MOCK_FOLDERS: Folder[] = [
  { path: "INBOX", name: "Inbox", delimiter: "/", flags: [], specialUse: "\\Inbox" },
  { path: "Sent Messages", name: "Sent", delimiter: "/", flags: [], specialUse: "\\Sent" },
  { path: "Drafts", name: "Drafts", delimiter: "/", flags: [], specialUse: "\\Drafts" },
  { path: "Deleted Messages", name: "Trash", delimiter: "/", flags: [], specialUse: "\\Trash" },
  { path: "Junk", name: "Spam", delimiter: "/", flags: [], specialUse: "\\Junk" },
];

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);

export const MOCK_EMAILS: Email[] = [
  {
    uid: 1001,
    messageId: "<mock-1001@qq.com>",
    subject: "Your Tencent Cloud bill is ready",
    from: [{ name: "Tencent Cloud", address: "cloud@tencent.com" }],
    to: [{ name: "Alex Chen", address: "alex@qq.com" }],
    date: hoursAgo(1),
    flags: [],
    hasAttachment: false,
    preview:
      "Dear user, your Tencent Cloud bill for March 2024 has been generated. Total amount: ¥128.50. Please log in to the console to view details...",
  },
  {
    uid: 1002,
    messageId: "<mock-1002@qq.com>",
    subject: "Re: Product review meeting next week",
    from: [{ name: "Sarah Li", address: "sarah@example.com" }],
    to: [{ name: "Alex Chen", address: "alex@qq.com" }],
    date: hoursAgo(3),
    flags: [],
    hasAttachment: true,
    preview:
      "Hi Alex, the product review is scheduled for next Wednesday at 2pm in Meeting Room 3. I've attached the meeting notes and prototype files for your review...",
  },
  {
    uid: 1003,
    messageId: "<mock-1003@qq.com>",
    subject: "GitHub: Pull request merged",
    from: [{ name: "GitHub", address: "noreply@github.com" }],
    to: [{ name: "Alex Chen", address: "alex@qq.com" }],
    date: hoursAgo(5),
    flags: ["\\Seen"],
    hasAttachment: false,
    preview: "Pull request #4821 'feat: add QQ Mail extension' was successfully merged into main by ariesly...",
  },
  {
    uid: 1004,
    messageId: "<mock-1004@qq.com>",
    subject: "Your package has arrived — please pick it up",
    from: [{ name: "SF Express", address: "service@sf-express.com" }],
    to: [{ name: "Alex Chen", address: "alex@qq.com" }],
    date: hoursAgo(8),
    flags: ["\\Seen"],
    hasAttachment: false,
    preview:
      "Your package (tracking: SF1234567890) has arrived at the pickup station. Please collect it within 48 hours...",
  },
  {
    uid: 1005,
    messageId: "<mock-1005@qq.com>",
    subject: "Weekly Digest: Top stories in Technology",
    from: [{ name: "Hacker Newsletter", address: "newsletter@hackernewsletter.com" }],
    to: [{ name: "Alex Chen", address: "alex@qq.com" }],
    date: hoursAgo(12),
    flags: ["\\Seen"],
    hasAttachment: false,
    preview:
      "This week's top stories: OpenAI releases GPT-5, Apple announces Vision Pro 2, Rust 2.0 is here and it's faster than ever...",
  },
  {
    uid: 1006,
    messageId: "<mock-1006@qq.com>",
    subject: "Your invoice is ready",
    from: [{ name: "JD.com", address: "invoice@jd.com" }],
    to: [{ name: "Alex Chen", address: "alex@qq.com" }],
    date: hoursAgo(24),
    flags: ["\\Seen"],
    hasAttachment: true,
    preview:
      "Your order (JD-20240409-88888) invoice has been issued. Please find the electronic invoice attached to this email...",
  },
  {
    uid: 1007,
    messageId: "<mock-1007@qq.com>",
    subject: "Team Weekly Report | Week 14, 2024",
    from: [{ name: "Tom Wang", address: "tom@company.com" }],
    to: [{ name: "Alex Chen", address: "alex@qq.com" }],
    cc: [{ name: "Jane Zhao", address: "jane@company.com" }],
    date: hoursAgo(30),
    flags: [],
    hasAttachment: true,
    preview:
      "Completed this week: user growth module optimization, payment flow load testing, onboarding new engineers. Next week: Q2 OKR alignment, canary release...",
  },
  {
    uid: 1008,
    messageId: "<mock-1008@qq.com>",
    subject: "Vercel: Deployment successful 🎉",
    from: [{ name: "Vercel", address: "noreply@vercel.com" }],
    to: [{ name: "Alex Chen", address: "alex@qq.com" }],
    date: hoursAgo(36),
    flags: ["\\Seen"],
    hasAttachment: false,
    preview: "Your deployment to production is live! Project: my-portfolio, URL: https://my-portfolio.vercel.app...",
  },
];

export const MOCK_EMAIL_BODY: Record<number, { text?: string; html?: string }> = {
  1001: {
    text: "Dear user,\n\nYour Tencent Cloud bill for March 2024 has been generated.\n\nTotal amount: ¥128.50\nBilling period: March 1, 2024 – March 31, 2024\n\nPlease log in to the Tencent Cloud console to view your detailed bill.\n\nThank you for using Tencent Cloud!",
  },
  1002: {
    text: "Hi Alex,\n\nThe product review meeting is scheduled for next Wednesday (April 17) at 2:00 PM in Meeting Room 3. We'll be reviewing the Q2 feature prototypes.\n\nI've attached the meeting notes template and the latest prototype files. Please take a look beforehand — feel free to reach out if you have any questions.\n\nThanks,\nSarah",
  },
};
