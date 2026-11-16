import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { isNotFound } from "../lib/api";
import { getStrings } from "../lib/strings";
import { Shortcuts } from "../lib/shortcuts";
import type { CompanySummary } from "../lib/types";
import { companyUrl, personUrl, type CompanyPage } from "../lib/urls";
import { PersonView } from "./PersonView";

/** Actions for a row that isn't itself a company, e.g. an announcement: open the page and refresh. */
export function PageActions(props: {
  company: CompanySummary;
  page: CompanyPage;
  title: string;
  onRefresh?: () => void;
}) {
  const t = getStrings();
  return (
    <ActionPanel.Section title={props.title}>
      <Action.OpenInBrowser
        title={`${t.openOnAreg}: ${props.title}`}
        url={companyUrl(props.company.orgnr, props.page)}
        shortcut={Shortcuts.openPage}
      />
      {props.onRefresh && (
        <Action title={t.refresh} icon={Icon.ArrowClockwise} shortcut={Shortcuts.refresh} onAction={props.onRefresh} />
      )}
    </ActionPanel.Section>
  );
}

export function PersonActions(props: { name: string; born: number | null | undefined; children?: React.ReactNode }) {
  const t = getStrings();
  return (
    <ActionPanel title={props.name}>
      {props.born ? (
        <ActionPanel.Section>
          <Action.Push
            title={t.person}
            icon={Icon.Person}
            target={<PersonView name={props.name} born={props.born} />}
          />
          <Action.OpenInBrowser title={t.openOnAreg} url={personUrl(props.name, props.born)} />
        </ActionPanel.Section>
      ) : null}
      <ActionPanel.Section title={t.sectionCopy}>
        <Action.CopyToClipboard title={t.copyName} content={props.name} shortcut={Shortcuts.copyName} />
      </ActionPanel.Section>
      {props.children}
    </ActionPanel>
  );
}

/** Empty view that tells a missing resource apart from a failed request. */
export function ResourceEmptyView(props: { isLoading: boolean; error?: Error; emptyTitle: string; icon?: Icon }) {
  const t = getStrings();
  if (props.isLoading) return <List.EmptyView icon={props.icon} title="" />;
  if (props.error && !isNotFound(props.error)) {
    return <List.EmptyView icon={Icon.Warning} title={t.error} description={props.error.message} />;
  }
  return <List.EmptyView icon={props.icon ?? Icon.Tray} title={props.emptyTitle} />;
}
