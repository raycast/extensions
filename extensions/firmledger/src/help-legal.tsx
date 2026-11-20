import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { LINKS, sectionLabel } from "./lib/theme";

const ITEMS = [
  { title: "Help Centre", subtitle: "Guides, FAQs and troubleshooting", icon: Icon.QuestionMark, url: LINKS.help },
  { title: "Terms of Use", subtitle: "The terms that apply to FirmLedger and this extension", icon: Icon.Document, url: LINKS.terms },
  { title: "Privacy Policy", subtitle: "How FirmLedger handles your data", icon: Icon.Lock, url: LINKS.privacy },
];
const MORE = [
  { title: "AI Assistant Setup Guide", subtitle: "MCP connection guide", icon: Icon.Book, url: LINKS.setup },
  { title: "Manage API Keys", subtitle: "Dashboard → Developer API", icon: Icon.Key, url: LINKS.apiKeys },
  { title: "Pricing & Pro", subtitle: "Plans and free trial", icon: Icon.CreditCard, url: LINKS.pricing },
  { title: "Email Support", subtitle: "support@firmledger.co.ke", icon: Icon.Envelope, url: LINKS.support },
];

function Row({ r }: { r: (typeof ITEMS)[number] }) {
  return (
    <List.Item
      title={r.title}
      subtitle={r.subtitle}
      icon={r.icon}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={r.url} />
          <Action.CopyToClipboard title="Copy Link" content={r.url} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  return (
    <List searchBarPlaceholder="Help, legal and support…">
      <List.Section title={sectionLabel("Legal & help")}>
        {ITEMS.map((r) => (
          <Row key={r.title} r={r} />
        ))}
      </List.Section>
      <List.Section title={sectionLabel("More")}>
        {MORE.map((r) => (
          <Row key={r.title} r={r} />
        ))}
      </List.Section>
    </List>
  );
}
