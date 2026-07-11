import { Action, ActionPanel, List } from "@raycast/api";

const BASE = "https://clavioapp.com";

type Guide = { slug: string; title: string; keywords: string[] };

const SECTIONS: { title: string; guides: Guide[] }[] = [
  {
    title: "Start Here",
    guides: [
      { slug: "what-is-ai-dictation", title: "What Is AI Dictation", keywords: ["intro", "basics"] },
      { slug: "dictate-on-mac", title: "How to Dictate on a Mac", keywords: ["setup", "how to"] },
      { slug: "talk-to-text-mac", title: "Talk to Text on a Mac", keywords: ["speech", "voice"] },
      { slug: "voice-typing-mac", title: "Voice Typing on a Mac", keywords: ["typing"] },
      { slug: "speech-to-text-mac", title: "Speech to Text on a Mac", keywords: ["transcription"] },
    ],
  },
  {
    title: "Choosing an App",
    guides: [
      {
        slug: "best-ai-dictation-app-mac",
        title: "Best AI Dictation App for Mac — What to Look For",
        keywords: ["compare", "criteria"],
      },
      { slug: "free-dictation-app-mac", title: "Free Dictation App for Mac", keywords: ["free", "pricing"] },
      { slug: "replace-apple-dictation", title: "Replace Apple's Built-in Dictation", keywords: ["apple", "switch"] },
      {
        slug: "hands-free-dictation-mac",
        title: "Hands-Free Dictation on a Mac",
        keywords: ["wake word", "always on"],
      },
    ],
  },
  {
    title: "Use Cases",
    guides: [
      {
        slug: "dictate-email-mac",
        title: "Dictate Email (Gmail, Outlook, Mail)",
        keywords: ["email", "gmail", "outlook"],
      },
      { slug: "dictate-in-any-app-mac", title: "Dictate in Any Mac App", keywords: ["universal"] },
      { slug: "multilingual-dictation-mac", title: "Multilingual Dictation", keywords: ["languages", "bilingual"] },
      { slug: "voice-commands-mac", title: "Voice Commands to Control Your Mac", keywords: ["voice control"] },
      {
        slug: "dictation-for-developers",
        title: "Dictation for Developers",
        keywords: ["coding", "prompts", "vibe coding"],
      },
      { slug: "dictation-for-writers", title: "Dictation for Writers", keywords: ["writing", "drafting"] },
    ],
  },
  {
    title: "Dictate Into Specific Apps",
    guides: [
      { slug: "voice-typing-google-docs-mac", title: "Voice Typing in Google Docs", keywords: ["google docs"] },
      { slug: "dictate-in-microsoft-word-mac", title: "Dictate in Microsoft Word", keywords: ["word", "office"] },
      { slug: "dictate-in-slack-mac", title: "Dictate in Slack", keywords: ["slack", "chat"] },
      { slug: "dictate-in-notion-mac", title: "Dictate in Notion", keywords: ["notion", "notes"] },
      { slug: "dictate-in-chatgpt-mac", title: "Dictate to ChatGPT", keywords: ["chatgpt", "ai", "prompts"] },
      { slug: "dictate-whatsapp-mac", title: "Dictate WhatsApp Messages", keywords: ["whatsapp", "messaging"] },
    ],
  },
  {
    title: "Troubleshooting & Mastery",
    guides: [
      {
        slug: "mac-dictation-not-working",
        title: "Mac Dictation Not Working — Fixes",
        keywords: ["broken", "fix", "troubleshoot"],
      },
      {
        slug: "mac-dictation-30-second-limit",
        title: "Why Mac Dictation Stops After 30 Seconds",
        keywords: ["limit", "timeout"],
      },
      {
        slug: "mac-dictation-commands",
        title: "Mac Dictation Commands — Full List",
        keywords: ["commands", "punctuation"],
      },
      { slug: "dictate-with-punctuation-mac", title: "Dictating Punctuation", keywords: ["punctuation", "comma"] },
      {
        slug: "change-mac-dictation-shortcut",
        title: "Change the Mac Dictation Shortcut",
        keywords: ["shortcut", "hotkey"],
      },
      {
        slug: "improve-dictation-accuracy-mac",
        title: "Improve Dictation Accuracy",
        keywords: ["accuracy", "microphone"],
      },
      { slug: "is-mac-dictation-private", title: "Is Mac Dictation Private?", keywords: ["privacy", "security"] },
    ],
  },
];

export default function Command() {
  return (
    <List searchBarPlaceholder="Search dictation guides…">
      {SECTIONS.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.guides.map((guide) => (
            <List.Item
              key={guide.slug}
              title={guide.title}
              keywords={guide.keywords}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`${BASE}/guides/${guide.slug}`} />
                  <Action.CopyToClipboard title="Copy Link" content={`${BASE}/guides/${guide.slug}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      <List.Section title="More">
        <List.Item
          title="All Guides"
          keywords={["hub", "index"]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${BASE}/guides`} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
