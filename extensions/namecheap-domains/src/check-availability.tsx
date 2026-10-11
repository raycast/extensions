import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { useAvailability, usePricing } from "./hooks";
import { buildCandidates, parseTldList } from "./domain/normalize";
import { feeNote, hasExtraFees, priceForDomain, priceLabel } from "./domain/price";
import { registrationUrl, websiteUrl, whoisUrl } from "./namecheap/urls";
import { isSandbox } from "./preferences";
import { SetupEmptyView } from "./setup";
import { clearStoredData } from "./storage";
import { RegisterDomainForm } from "./register-domain";
import type { DomainCheckResult, PricingTable } from "./namecheap/types";
import { useDebouncedValue } from "./use-debounced-value";

const SEARCH_DEBOUNCE_MS = 350;

function accessoriesFor(result: DomainCheckResult, pricing: PricingTable): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (result.errorNo !== 0) {
    accessories.push({
      tag: { value: "Unavailable", color: Color.SecondaryText },
      tooltip: result.description || `Namecheap error ${result.errorNo}`,
    });
    return accessories;
  }

  if (result.available) {
    const price = priceForDomain(result.domain, pricing, 1, result);
    if (result.isPremium) {
      accessories.push({ tag: { value: "Premium", color: Color.Purple }, tooltip: "Premium domain" });
    }
    if (price?.eapFee) {
      // An early-access fee can be orders of magnitude above the registration price, so quoting the
      // registration price alone would mislead rather than merely round.
      accessories.push({
        tag: { value: "Early access", color: Color.Orange },
        tooltip: `This TLD is in its Early Access Program. ${feeNote(price)}. The real cost is shown at checkout.`,
      });
      accessories.push({ text: "Price at checkout", icon: Icon.Coins });
    } else if (price) {
      const notes = [
        price.regular !== undefined
          ? `Regular price ${priceLabel({ ...price, amount: price.regular, regular: undefined }, 1)}`
          : "Registration price from your Namecheap pricing",
        hasExtraFees(price) ? feeNote(price) : "",
      ].filter(Boolean);
      accessories.push({
        text: hasExtraFees(price) ? `${priceLabel(price, 1)}+` : priceLabel(price, 1),
        icon: Icon.Coins,
        tooltip: notes.join(". "),
      });
    }
    accessories.push({ tag: { value: "Available", color: Color.Green } });
    return accessories;
  }

  accessories.push({ tag: { value: "Taken", color: Color.Red } });
  return accessories;
}

export default function CheckAvailability() {
  const sandbox = isSandbox();
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebouncedValue(searchText, SEARCH_DEBOUNCE_MS);

  const defaultTlds = useMemo(() => {
    const { defaultTlds: configured } = getPreferenceValues<Preferences.CheckAvailability>();
    return parseTldList(configured);
  }, []);

  const { mode, query, candidates } = useMemo(
    () => buildCandidates(debouncedSearch, defaultTlds),
    [debouncedSearch, defaultTlds],
  );

  const { data: results, isLoading, error } = useAvailability(candidates);
  const { data: pricing, refresh: refreshPricing, isLoading: isLoadingPricing } = usePricing();

  const shown = useMemo(
    () => (candidates.length > 0 ? results.filter((result) => candidates.includes(result.domain)) : []),
    [results, candidates],
  );

  const available = shown.filter((result) => result.errorNo === 0 && result.available);
  const taken = shown.filter((result) => result.errorNo === 0 && !result.available);
  const unsupported = shown.filter((result) => result.errorNo !== 0);

  const utilityActions = (
    <ActionPanel.Section>
      <Action
        title="Refresh Pricing"
        icon={Icon.Coins}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refreshPricing}
      />
      <Action
        title="Open Extension Preferences"
        icon={Icon.Gear}
        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        onAction={openExtensionPreferences}
      />
      <Action
        title="Clear Stored Data"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={async () => {
          await clearStoredData();
          await showToast({ style: Toast.Style.Success, title: "Cleared stored data" });
        }}
      />
    </ActionPanel.Section>
  );

  function itemFor(result: DomainCheckResult) {
    const isAvailable = result.errorNo === 0 && result.available;
    const icon =
      result.errorNo !== 0
        ? { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText }
        : isAvailable
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.XMarkCircle, tintColor: Color.Red };

    return (
      <List.Item
        key={result.domain}
        icon={icon}
        title={result.domain}
        subtitle={result.errorNo !== 0 ? result.description || `Error ${result.errorNo}` : undefined}
        accessories={accessoriesFor(result, pricing)}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {isAvailable ? (
                <>
                  <Action.OpenInBrowser
                    title="Register on Namecheap"
                    icon={Icon.Cart}
                    url={registrationUrl(result.domain, sandbox)}
                  />
                  <Action.Push
                    title="Check Price and Register…"
                    icon={Icon.Receipt}
                    target={<RegisterDomainForm initialDomain={result.domain} />}
                  />
                </>
              ) : (
                <>
                  <Action.OpenInBrowser title="Open Website" icon={Icon.Globe} url={websiteUrl(result.domain)} />
                  <Action.OpenInBrowser
                    title="Look up Whois"
                    icon={Icon.MagnifyingGlass}
                    url={whoisUrl(result.domain, sandbox)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                  />
                </>
              )}
              <Action.CopyToClipboard
                title="Copy Domain"
                content={result.domain}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            </ActionPanel.Section>
            {utilityActions}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      navigationTitle={sandbox ? "Check Domain Availability (Sandbox)" : undefined}
      isLoading={isLoading || isLoadingPricing || searchText !== debouncedSearch}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="acme or acme.com"
      filtering={false}
    >
      {error ? (
        <SetupEmptyView error={error} />
      ) : mode === "empty" ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search for a domain"
          description={`Type a full domain like acme.com, or a keyword to check it across ${defaultTlds.join(", ")}.`}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : mode === "invalid" ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          title="That is not a valid domain"
          description={`"${query}" cannot be registered. Use letters, digits and hyphens, for example acme-shop.com.`}
        />
      ) : (
        <List.EmptyView icon={Icon.Globe} title="Checking availability…" />
      )}

      <List.Section title="Available" subtitle={available.length ? String(available.length) : undefined}>
        {available.map(itemFor)}
      </List.Section>
      <List.Section title="Taken" subtitle={taken.length ? String(taken.length) : undefined}>
        {taken.map(itemFor)}
      </List.Section>
      <List.Section
        title="Not Supported by the API"
        subtitle={unsupported.length ? String(unsupported.length) : undefined}
      >
        {unsupported.map(itemFor)}
      </List.Section>
    </List>
  );
}
