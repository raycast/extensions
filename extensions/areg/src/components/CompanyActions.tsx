import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  getPreferenceValues,
  Icon,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { ReactNode } from "react";
import { getStrings } from "../lib/strings";
import { formatOrgnr } from "../lib/orgnr";
import { Shortcuts } from "../lib/shortcuts";
import { clearRecents, moveFavorite, removeRecent, toggleFavorite, trackRecent, useStore } from "../lib/store";
import type { CompanySummary } from "../lib/types";
import { brregUrl, companyUrl } from "../lib/urls";
import { AnnouncementsView } from "./AnnouncementsView";
import { CompanyDetail } from "./CompanyDetail";
import { FinancialLicensesView } from "./FinancialLicensesView";
import { FinancialsView } from "./FinancialsView";
import { GrantsView } from "./GrantsView";
import { GroupView } from "./GroupView";
import { HistoryView } from "./HistoryView";
import { HoldingsView } from "./HoldingsView";
import { IpRightsView } from "./IpRightsView";
import { RolesView } from "./RolesView";
import { ShareholdersView } from "./ShareholdersView";
import { TendersView } from "./TendersView";
import { TransportLicensesView } from "./TransportLicensesView";

type Props = {
  company: CompanySummary;
  /** Where the actions are shown. In the company view, "Show Company" is left out. */
  context?: "list" | "detail";
  /** Actions for the row itself, shown before the company actions so the first one takes ↵. */
  leading?: ReactNode;
  /** Actions for the surrounding page, shown after the primary company actions. */
  children?: ReactNode;
  website?: string;
  address?: string;
  onToggleDetail?: () => void;
  onRefresh?: () => void;
  recent?: boolean;
  favoriteIndex?: number;
  favoriteCount?: number;
};

export function CompanyActions(props: Props) {
  const { company, context = "list" } = props;
  const t = getStrings();
  const { favorites } = useStore();
  const isFavorite = favorites.some((c) => c.orgnr === company.orgnr);
  const { primaryAction } = getPreferenceValues<Preferences>();
  // Recents are a convenience, so a failed save is not worth interrupting the user for.
  const track = () => void trackRecent(company).catch(() => undefined);

  const show = (
    <Action.Push
      key="show"
      title={t.showCompany}
      icon={Icon.Building}
      target={<CompanyDetail company={company} />}
      onPush={track}
    />
  );
  const open = <Action.OpenInBrowser key="open" title={t.openOnAreg} url={companyUrl(company.orgnr)} onOpen={track} />;
  const primary = context === "detail" ? [open] : primaryAction === "browser" ? [open, show] : [show, open];

  const explore = (
    title: string,
    icon: Icon,
    shortcut: Parameters<typeof Action.Push>[0]["shortcut"],
    target: ReactNode,
  ) => <Action.Push title={title} icon={icon} shortcut={shortcut} target={target} onPush={track} />;

  return (
    <ActionPanel title={company.name}>
      {props.leading}
      <ActionPanel.Section title={t.sectionPrimary}>{primary}</ActionPanel.Section>
      {props.children}

      <ActionPanel.Section title={t.sectionCopy}>
        <Action.CopyToClipboard
          title={t.copyOrgnr}
          content={company.orgnr}
          shortcut={Shortcuts.copyOrgnr}
          onCopy={track}
        />
        <Action.CopyToClipboard
          title={t.copyName}
          content={company.name}
          shortcut={Shortcuts.copyName}
          onCopy={track}
        />
        <Action.CopyToClipboard
          title={t.copyNameAndOrgnr}
          content={`${company.name} (${formatOrgnr(company.orgnr)})`}
          shortcut={Shortcuts.copyNameAndOrgnr}
          onCopy={track}
        />
        <Action.Paste title={t.pasteOrgnr} content={company.orgnr} shortcut={Shortcuts.pasteOrgnr} onPaste={track} />
        <Action.CopyToClipboard
          title={t.copyUrl}
          content={companyUrl(company.orgnr)}
          shortcut={Shortcuts.copyUrl}
          onCopy={track}
        />
        {props.address && (
          <Action
            title={t.copyAddress}
            icon={Icon.Pin}
            onAction={async () => {
              await Clipboard.copy(props.address ?? "");
              await showHUD(t.copied(t.address.toLowerCase()));
            }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title={t.sectionExplore}>
        {explore(t.shareholders, Icon.PieChart, Shortcuts.shareholders, <ShareholdersView company={company} />)}
        {explore(t.holdings, Icon.Coins, Shortcuts.holdings, <HoldingsView company={company} />)}
        {explore(t.roles, Icon.TwoPeople, Shortcuts.roles, <RolesView company={company} />)}
        {explore(t.financials, Icon.BarChart, Shortcuts.financials, <FinancialsView company={company} />)}
        {explore(t.group, Icon.Network, Shortcuts.group, <GroupView company={company} />)}
        {explore(t.announcements, Icon.Megaphone, Shortcuts.announcements, <AnnouncementsView company={company} />)}
        {explore(t.history, Icon.Clock, Shortcuts.history, <HistoryView company={company} />)}
        {explore(t.grants, Icon.BankNote, Shortcuts.grants, <GrantsView company={company} />)}
        {explore(t.tenders, Icon.Hammer, Shortcuts.tenders, <TendersView company={company} />)}
        {explore(t.ipRights, Icon.Trophy, Shortcuts.ipRights, <IpRightsView company={company} />)}
        {explore(t.transportLicenses, Icon.Car, Shortcuts.licenses, <TransportLicensesView company={company} />)}
        {explore(t.financialLicenses, Icon.Shield, undefined, <FinancialLicensesView company={company} />)}
      </ActionPanel.Section>

      <ActionPanel.Section title={t.sectionOpen}>
        <Action.OpenInBrowser
          title={t.openOnBrreg}
          icon={Icon.Globe}
          url={brregUrl(company.orgnr)}
          shortcut={Shortcuts.openBrreg}
          onOpen={track}
        />
        {props.website && (
          <Action.OpenInBrowser
            title={t.openWebsite}
            icon={Icon.Link}
            url={props.website}
            shortcut={Shortcuts.openWebsite}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title={t.sectionManage}>
        <Action
          title={isFavorite ? t.removeFavorite : t.addFavorite}
          icon={isFavorite ? Icon.StarDisabled : Icon.Star}
          shortcut={Shortcuts.favorite}
          onAction={async () => {
            try {
              const added = await toggleFavorite(company);
              await showToast({ style: Toast.Style.Success, title: added ? t.addedFavorite : t.removedFavorite });
            } catch (error) {
              await showFailureToast(error, { title: t.saveFailed });
            }
          }}
        />
        {props.favoriteIndex !== undefined && props.favoriteIndex > 0 && (
          <Action
            title={t.moveUp}
            icon={Icon.ArrowUp}
            shortcut={Shortcuts.moveUp}
            onAction={() =>
              moveFavorite(company.orgnr, -1).catch((error) => showFailureToast(error, { title: t.saveFailed }))
            }
          />
        )}
        {props.favoriteIndex !== undefined &&
          props.favoriteCount !== undefined &&
          props.favoriteIndex < props.favoriteCount - 1 && (
            <Action
              title={t.moveDown}
              icon={Icon.ArrowDown}
              shortcut={Shortcuts.moveDown}
              onAction={() =>
                moveFavorite(company.orgnr, 1).catch((error) => showFailureToast(error, { title: t.saveFailed }))
              }
            />
          )}
        {props.recent && (
          <>
            <Action
              title={t.removeRecent}
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={Shortcuts.removeRecent}
              onAction={() => removeRecent(company.orgnr).catch((error) => showFailureToast(error))}
            />
            <Action
              title={t.clearRecents}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Shortcuts.clearRecents}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: t.clearRecentsTitle,
                  message: t.clearRecentsMessage,
                  icon: Icon.Trash,
                  primaryAction: { title: t.clear, style: Alert.ActionStyle.Destructive },
                });
                if (confirmed) await clearRecents().catch((error) => showFailureToast(error));
              }}
            />
          </>
        )}
        {props.onToggleDetail && (
          <Action
            title={t.toggleDetail}
            icon={Icon.Sidebar}
            shortcut={Shortcuts.toggleDetail}
            onAction={props.onToggleDetail}
          />
        )}
        {props.onRefresh && (
          <Action
            title={t.refresh}
            icon={Icon.ArrowClockwise}
            shortcut={Shortcuts.refresh}
            onAction={props.onRefresh}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
