import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import KeyboardShortcutsHelp from "./KeyboardShortcutsHelp";
import ChangelogView from "./ChangelogView";
import { Company } from "../types";
import { KEYBOARD_SHORTCUTS, USER_AGENT } from "../constants";
import { useState, useEffect, useMemo, useCallback } from "react";
import { copyVatNumberToClipboard, getAlleAsUrl } from "../utils/entity";
import { getMapTileUrl } from "../utils/map";

const TAB_ORDER = ["overview", "financials", "map"] as const;
type TabId = (typeof TAB_ORDER)[number];

const TABS = [
  { id: "overview", title: "Overview" },
  { id: "financials", title: "Financials" },
  { id: "map", title: "Map" },
] as const satisfies ReadonlyArray<{ id: TabId; title: string }>;

interface CompanyDetailsViewProps {
  company: Company;
  isLoading: boolean;
  onBack: () => void;
  isFavorite: boolean;
  onAddFavorite: () => void;
  onRemoveFavorite: () => void;
}

function formatOrganizationForm(company: Company): string | undefined {
  if (company.organizationFormDescription && company.organizationFormCode) {
    return `${company.organizationFormDescription} (${company.organizationFormCode})`;
  }
  return company.organizationFormDescription || company.organizationFormCode;
}

function formatYesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

export default function CompanyDetailsView({
  company,
  isLoading,
  onBack,
  isFavorite,
  onAddFavorite,
  onRemoveFavorite,
}: CompanyDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [mapImageUrl, setMapImageUrl] = useState<string | undefined>(undefined);
  const geocodeCacheRef = useMemo(() => new Map<string, { lat: number; lon: number }>(), []);
  const lastGeocodeAtRef = useMemo(() => ({ value: 0 }), []);

  const copyVatNumber = useCallback(
    () => copyVatNumberToClipboard(company.organizationNumber, company.name, company.isVatRegistered),
    [company.organizationNumber, company.name, company.isVatRegistered],
  );

  // Format address manually since we don't have the Enhet format
  const formattedAddress = useMemo(() => {
    const addressParts: string[] = [];
    if (company.address) addressParts.push(company.address);
    if (company.postalCode && company.city) addressParts.push(`${company.postalCode} ${company.city}`);
    else if (company.city) addressParts.push(company.city);
    return addressParts.join(", ");
  }, [company.address, company.postalCode, company.city]);

  const goToPreviousTab = useCallback(() => {
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    const previousIndex = (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    setActiveTab(TAB_ORDER[previousIndex]);
  }, [activeTab]);

  // Map functionality
  useEffect(() => {
    let cancelled = false;
    async function geocodeAndBuildMap() {
      if (activeTab !== "map" || !formattedAddress || mapImageUrl) return;
      try {
        // Very lightweight rate limiting to avoid accidental bursts
        const now = Date.now();
        if (now - lastGeocodeAtRef.value < 1000) return;
        lastGeocodeAtRef.value = now;

        const ZOOM = 14;
        const cached = geocodeCacheRef.get(formattedAddress);
        if (cached) {
          setMapImageUrl(getMapTileUrl(cached.lat, cached.lon, ZOOM));
          return;
        }

        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(formattedAddress)}`,
          { headers: { Accept: "application/json", "User-Agent": USER_AGENT } },
        );
        if (!res.ok) return;
        const json = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (cancelled || !json?.length) return;
        const latNum = parseFloat(json[0].lat);
        const lonNum = parseFloat(json[0].lon);
        geocodeCacheRef.set(formattedAddress, { lat: latNum, lon: lonNum });
        setMapImageUrl(getMapTileUrl(latNum, lonNum, ZOOM));
      } catch {
        // ignore
      }
    }
    geocodeAndBuildMap();
    return () => {
      cancelled = true;
    };
  }, [activeTab, formattedAddress, mapImageUrl, geocodeCacheRef, lastGeocodeAtRef]);

  const tabsHeader = useMemo(() => {
    return TABS.map((t) => {
      const isActive = t.id === activeTab;
      const bullet = isActive ? "●" : "○";
      const label = isActive ? `**${t.title}**` : t.title;
      return `${bullet} ${label}`;
    }).join("   ");
  }, [activeTab]);

  const markdown = useMemo(() => {
    if (activeTab === "overview") {
      const contactLines = [
        company.phone ? `**Phone:** ${company.phone}` : undefined,
        company.email ? `**Email:** ${company.email}` : undefined,
        company.website ? `**Website:** [${company.website}](${company.website})` : undefined,
      ].filter(Boolean);
      const linkParts = [
        company.bregUrl ? `[Open in Brreg](${company.bregUrl})` : undefined,
        company.organizationNumber ? `[Open in Alle.as](${getAlleAsUrl(company.organizationNumber)})` : undefined,
        company.organizationNumber
          ? `[Search in Proff](https://www.proff.no/bransjes%C3%B8k?q=${encodeURIComponent(company.name)})`
          : undefined,
      ].filter(Boolean);

      return `${tabsHeader}\n\n# ${company.name}

${company.description ? `## Description\n\n${company.description}\n\n` : ""}${contactLines.length > 0 ? `## Contact Information\n\n${contactLines.join("\n\n")}\n\n` : ""}${linkParts.length > 0 ? linkParts.join(" | ") : ""}`;
    }

    if (activeTab === "financials") {
      return `${tabsHeader}\n\n# Financial Information

${company.accountingYear ? `**Accounting Year:** ${company.accountingYear}\n\n` : ""}${company.revenue ? `**Revenue:** ${company.revenue}\n\n` : ""}${company.ebitda ? `**EBITDA:** ${company.ebitda}\n\n` : ""}${company.operatingResult ? `**Operating Result:** ${company.operatingResult}\n\n` : ""}${company.result ? `**Net Result:** ${company.result}\n\n` : ""}${company.totalAssets ? `**Total Assets:** ${company.totalAssets}\n\n` : ""}${company.equity ? `**Equity:** ${company.equity}\n\n` : ""}${company.totalDebt ? `**Total Debt:** ${company.totalDebt}\n\n` : ""}${company.depreciation ? `**Depreciation:** ${company.depreciation}\n\n` : ""}${company.isAuditRequired !== undefined ? `**Audit Required:** ${formatYesNo(company.isAuditRequired)}\n\n` : ""}${company.isAudited !== undefined ? `**Audited Accounts:** ${formatYesNo(company.isAudited)}\n\n` : ""}`;
    }

    if (activeTab === "map") {
      return `${tabsHeader}\n\n# Location Information

${formattedAddress ? `**Address:** ${formattedAddress}\n\n` : ""}${mapImageUrl ? `![Map](${mapImageUrl})\n\n` : ""}${formattedAddress ? `[Get Directions](https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formattedAddress)})` : ""}`;
    }

    return "";
  }, [
    activeTab,
    company.name,
    company.description,
    company.organizationNumber,
    company.phone,
    company.email,
    company.website,
    company.bregUrl,
    company.accountingYear,
    company.revenue,
    company.ebitda,
    company.operatingResult,
    company.result,
    company.totalAssets,
    company.equity,
    company.totalDebt,
    company.depreciation,
    company.isAuditRequired,
    company.isAudited,
    formattedAddress,
    mapImageUrl,
    tabsHeader,
  ]);

  const metadata = useMemo(() => {
    if (activeTab === "overview") {
      const organizationForm = formatOrganizationForm(company);

      return (
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Favorite">
            <Detail.Metadata.TagList.Item text={isFavorite ? "Yes" : "No"} color={isFavorite ? "green" : "gray"} />
          </Detail.Metadata.TagList>
          {company.organizationNumber && (
            <Detail.Metadata.Label title="Organization Number" text={company.organizationNumber} />
          )}
          {organizationForm && <Detail.Metadata.Label title="Organization Form" text={organizationForm} />}
          {formattedAddress && <Detail.Metadata.Label title="Address" text={formattedAddress} />}
          {company.municipality && (
            <Detail.Metadata.Label
              title="Municipality"
              text={`${company.municipality}${company.municipalityNumber ? ` (${company.municipalityNumber})` : ""}`}
            />
          )}
          {company.industry && <Detail.Metadata.Label title="Industry" text={company.industry} />}
          {company.naceCode && <Detail.Metadata.Label title="NACE Code" text={company.naceCode} />}
          {company.founded && <Detail.Metadata.Label title="Founded" text={company.founded} />}
          {company.employees && <Detail.Metadata.Label title="Employees" text={company.employees} />}
          {company.isVatRegistered !== undefined && (
            <Detail.Metadata.Label title="VAT Registered" text={company.isVatRegistered ? "Yes" : "No"} />
          )}
          {company.isAuditRequired !== undefined && (
            <Detail.Metadata.Label title="Audit Required" text={formatYesNo(company.isAuditRequired)} />
          )}
          {company.isAudited !== undefined && (
            <Detail.Metadata.Label title="Audited Accounts" text={formatYesNo(company.isAudited)} />
          )}
        </Detail.Metadata>
      );
    }

    if (activeTab === "financials") {
      const hasFinancials = Boolean(
        company.accountingYear ||
          company.revenue ||
          company.operatingResult ||
          company.result ||
          company.totalAssets ||
          company.equity ||
          company.totalDebt ||
          company.ebitda ||
          company.depreciation ||
          company.isAuditRequired !== undefined ||
          company.isAudited !== undefined,
      );
      return (
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Favorite">
            <Detail.Metadata.TagList.Item text={isFavorite ? "Yes" : "No"} color={isFavorite ? "green" : "gray"} />
          </Detail.Metadata.TagList>
          {hasFinancials && (
            <>
              {company.accountingYear && (
                <Detail.Metadata.Label title="Accounting Year" text={company.accountingYear} />
              )}
              {company.revenue && <Detail.Metadata.Label title="Revenue" text={company.revenue} />}
              {company.ebitda && <Detail.Metadata.Label title="EBITDA" text={company.ebitda} />}
              {company.operatingResult && (
                <Detail.Metadata.Label title="Operating Result" text={company.operatingResult} />
              )}
              {company.result && <Detail.Metadata.Label title="Net Result" text={company.result} />}
              {company.totalAssets && <Detail.Metadata.Label title="Total Assets" text={company.totalAssets} />}
              {company.equity && <Detail.Metadata.Label title="Equity" text={company.equity} />}
              {company.totalDebt && <Detail.Metadata.Label title="Total Debt" text={company.totalDebt} />}
              {company.depreciation && <Detail.Metadata.Label title="Depreciation" text={company.depreciation} />}
              {company.isAuditRequired !== undefined && (
                <Detail.Metadata.Label title="Audit Required" text={formatYesNo(company.isAuditRequired)} />
              )}
              {company.isAudited !== undefined && (
                <Detail.Metadata.Label title="Audited Accounts" text={formatYesNo(company.isAudited)} />
              )}
            </>
          )}
        </Detail.Metadata>
      );
    }

    if (activeTab === "map") {
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        formattedAddress || company.name,
      )}`;
      return (
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Favorite">
            <Detail.Metadata.TagList.Item text={isFavorite ? "Yes" : "No"} color={isFavorite ? "green" : "gray"} />
          </Detail.Metadata.TagList>
          {formattedAddress && <Detail.Metadata.Label title="Address" text={formattedAddress} />}
          <Detail.Metadata.Link title="Directions" target={directionsUrl} text="Open in Google Maps" />
        </Detail.Metadata>
      );
    }

    return null;
  }, [activeTab, company, formattedAddress, isFavorite]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={metadata}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Brreg" url={company.bregUrl || "https://www.brreg.no"} />
          {company.organizationNumber && (
            <Action.OpenInBrowser title="Open in Alle.as" url={getAlleAsUrl(company.organizationNumber)} />
          )}
          {company.organizationNumber && (
            <Action.OpenInBrowser
              title="Search in Proff"
              url={`https://www.proff.no/bransjes%C3%B8k?q=${encodeURIComponent(company.name)}`}
            />
          )}
          {company.organizationNumber && (
            <Action.CopyToClipboard
              title="Copy Organization Number"
              content={company.organizationNumber}
              shortcut={KEYBOARD_SHORTCUTS.COPY_ORG_NUMBER}
            />
          )}
          {company.organizationNumber && (
            <Action
              title="Copy Vat Number"
              icon={Icon.Clipboard}
              onAction={copyVatNumber}
              shortcut={KEYBOARD_SHORTCUTS.COPY_VAT_NUMBER}
            />
          )}
          {formattedAddress && (
            <Action.CopyToClipboard
              title="Copy Business Address"
              content={formattedAddress}
              shortcut={KEYBOARD_SHORTCUTS.COPY_ADDRESS}
            />
          )}
          {company.revenue && (
            <Action.CopyToClipboard
              title="Copy Revenue"
              content={company.revenue}
              shortcut={KEYBOARD_SHORTCUTS.COPY_REVENUE}
            />
          )}
          {company.result && (
            <Action.CopyToClipboard
              title="Copy Net Result"
              content={company.result}
              shortcut={KEYBOARD_SHORTCUTS.COPY_NET_RESULT}
            />
          )}
          {isFavorite ? (
            <Action
              title="Remove from Favorites"
              onAction={onRemoveFavorite}
              shortcut={KEYBOARD_SHORTCUTS.REMOVE_FROM_FAVORITES}
            />
          ) : (
            <Action
              title="⭐ Add to Favorites"
              onAction={onAddFavorite}
              shortcut={KEYBOARD_SHORTCUTS.ADD_TO_FAVORITES}
            />
          )}
          <ActionPanel.Section title="Tabs">
            <Action
              title="Show Overview"
              onAction={() => setActiveTab("overview")}
              icon={Icon.AlignLeft}
              shortcut={KEYBOARD_SHORTCUTS.SHOW_OVERVIEW}
            />
            <Action
              title="Show Financials"
              onAction={() => setActiveTab("financials")}
              icon={Icon.Coins}
              shortcut={KEYBOARD_SHORTCUTS.SHOW_FINANCIALS}
            />
            <Action
              title="Show Map"
              onAction={() => setActiveTab("map")}
              icon={Icon.Map}
              shortcut={KEYBOARD_SHORTCUTS.SHOW_MAP}
            />
            <Action
              title="Previous Tab"
              onAction={goToPreviousTab}
              icon={Icon.ChevronLeft}
              shortcut={KEYBOARD_SHORTCUTS.PREVIOUS_TAB}
            />
          </ActionPanel.Section>
          {mapImageUrl && <Action.OpenInBrowser title="Open Static Map Image" url={mapImageUrl} />}
          <Action.Push title="Changelog" target={<ChangelogView />} />
          <Action.Push title="Keyboard Shortcuts" target={<KeyboardShortcutsHelp />} />
          <Action title="Go Back" onAction={onBack} shortcut={KEYBOARD_SHORTCUTS.GO_BACK} />
        </ActionPanel>
      }
    />
  );
}
