import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { Brand } from "../lib/brand";
import { useAreg } from "../lib/api";
import { formatDate } from "../lib/format";
import { getLanguage, getStrings } from "../lib/i18n";
import type { AnnouncementsResponse, CompanySummary } from "../lib/types";
import { CompanyActions } from "./CompanyActions";
import { PageActions, ResourceEmptyView } from "./common";

function eventIcon(event: string | null): Image.ImageLike {
  const e = event ?? "";
  if (e.startsWith("bankruptcy") || e.startsWith("forced"))
    return { source: Icon.ExclamationMark, tintColor: Brand.down };
  if (e.startsWith("deleted") || e.startsWith("dissolution"))
    return { source: Icon.XMarkCircle, tintColor: Brand.down };
  if (e.includes("merger")) return Icon.Shuffle;
  if (e.startsWith("board") || e.startsWith("ceo") || e.startsWith("auditor") || e.startsWith("signature"))
    return Icon.TwoPeople;
  if (e.includes("capital") || e.includes("dividend") || e.includes("shares") || e.includes("fund")) return Icon.Coins;
  if (e.startsWith("address")) return Icon.Pin;
  if (e.startsWith("name")) return Icon.Pencil;
  if (e.startsWith("annual_accounts")) return Icon.Document;
  return Icon.Megaphone;
}

export function AnnouncementsView({ company }: { company: CompanySummary }) {
  const t = getStrings();
  const locale = getLanguage();
  const { data, isLoading, error, revalidate } = useAreg<AnnouncementsResponse>(`/${company.orgnr}/announcements`);
  const items = [...(data?.announcements ?? [])].sort((a, b) => b.announcedOn.localeCompare(a.announcedOn));

  return (
    <List
      navigationTitle={`${t.announcements} · ${company.name}`}
      isLoading={isLoading}
      isShowingDetail={items.length > 0}
      searchBarPlaceholder={t.announcements}
    >
      <ResourceEmptyView isLoading={isLoading} error={error} emptyTitle={t.noAnnouncements} icon={Icon.Megaphone} />
      {items.map((item) => (
        <List.Item
          key={item.kid}
          icon={eventIcon(item.event)}
          title={item.type}
          keywords={[item.body.slice(0, 500), item.register]}
          accessories={[{ text: formatDate(item.announcedOn, locale) }]}
          detail={
            <List.Item.Detail
              markdown={`### ${item.type}\n\n${formatDate(item.announcedOn, locale)} · ${item.register}\n\n\`\`\`\n${item.body}\n\`\`\``}
            />
          }
          actions={
            <CompanyActions
              company={company}
              context="detail"
              leading={
                <>
                  <ActionPanel.Section title={item.type}>
                    {item.url && <Action.OpenInBrowser title={t.openAnnouncement} url={item.url} />}
                    <Action.CopyToClipboard title={t.copyText} content={item.body} />
                  </ActionPanel.Section>
                </>
              }
            >
              <PageActions company={company} page="announcements" title={t.announcements} onRefresh={revalidate} />
            </CompanyActions>
          }
        />
      ))}
    </List>
  );
}
