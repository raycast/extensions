import {
  Icon,
  LaunchType,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  open,
  openCommandPreferences,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { ConvertedTotal } from "../core/fx";
import { Money, formatMoney, formatMoneyList } from "../core/money";
import { parseRangeId } from "../core/ranges";
import { redact } from "../core/errors";
import { loadSummaries } from "../hooks/data";
import { displayCurrency, getExtensionPreferences } from "../hooks/runtime";
import { buyUrl } from "../license/config";
import { useLicense } from "../license/useLicense";
import { configuredProviderIds } from "../providers/registry";
import { DASHBOARD_URLS, PROVIDER_LABELS } from "../providers/types";
import { providerIcon } from "../ui/components";
import { SHORTCUTS } from "../ui/shortcuts";

type MenuBarPreferences = { menuBarRange?: string; menuBarShowProviderBreakdown?: boolean };

/** Short value as the title (4 of 5 menu-bar references), whole units like saasflow's MRR. */
export function menuBarTitle(amounts: Money[], converted?: ConvertedTotal): string {
  if (converted) {
    return [formatMoney(converted.total, "kpi"), ...converted.unconverted.map((m) => formatMoney(m, "kpi"))].join(
      " + ",
    );
  }
  return formatMoneyList(amounts, "kpi");
}

function Footer(props: { onRefresh?: () => void }) {
  return (
    <MenuBarExtra.Section>
      <MenuBarExtra.Item
        title="Open Revenue Dashboard"
        shortcut={SHORTCUTS.openDashboard}
        onAction={() => launchCommand({ name: "dashboard", type: LaunchType.UserInitiated })}
      />
      {props.onRefresh ? (
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={SHORTCUTS.refresh}
          onAction={props.onRefresh}
        />
      ) : null}
      <MenuBarExtra.Item
        title="Configure Command"
        icon={Icon.Gear}
        shortcut={SHORTCUTS.preferences}
        onAction={openCommandPreferences}
      />
    </MenuBarExtra.Section>
  );
}

export default function MenuBar() {
  const license = useLicense({ notify: false });
  const prefs = useMemo(getExtensionPreferences, []);
  const commandPrefs = getPreferenceValues<MenuBarPreferences>();
  const rangeId = parseRangeId(commandPrefs.menuBarRange, "today");
  const showBreakdown = commandPrefs.menuBarShowProviderBreakdown !== false;
  const currency = displayCurrency(prefs);
  // The menu bar is Pro-only, so every configured provider is active here.
  const ids = useMemo(() => configuredProviderIds(prefs), [prefs]);

  const { data, isLoading, revalidate } = useCachedPromise(loadSummaries, [rangeId, ids, currency], {
    keepPreviousData: true,
    execute: license.isPro && ids.length > 0,
    // Required: without onError, @raycast/utils shows a failure toast, which crashes menu-bar commands
    // (crypto-price reference). The last good data stays in the cache and on screen.
    onError: (error) => {
      console.error(`Revenue Bar menu bar refresh failed: ${redact(error.message)}`);
    },
  });

  const loading = isLoading || license.isLoading;

  if (!license.isPro) {
    return (
      <MenuBarExtra icon={Icon.LineChart} tooltip="Revenue Bar" isLoading={loading}>
        <MenuBarExtra.Section title="Revenue Bar Pro">
          <MenuBarExtra.Item title="The menu bar is part of Revenue Bar Pro" />
          <MenuBarExtra.Item title="Buy Revenue Bar Pro" icon={Icon.Cart} onAction={() => open(buyUrl())} />
          <MenuBarExtra.Item
            title="Enter License Key…"
            icon={Icon.Key}
            shortcut={SHORTCUTS.license}
            onAction={openExtensionPreferences}
          />
        </MenuBarExtra.Section>
        <Footer />
      </MenuBarExtra>
    );
  }

  if (ids.length === 0) {
    return (
      <MenuBarExtra icon={Icon.LineChart} tooltip="Revenue Bar" isLoading={loading}>
        <MenuBarExtra.Item title="Add an API Key…" icon={Icon.Key} onAction={openExtensionPreferences} />
        <Footer />
      </MenuBarExtra>
    );
  }

  const title = data ? menuBarTitle(data.combined.gross, data.combined.converted?.gross) : undefined;

  return (
    <MenuBarExtra icon={Icon.LineChart} title={title} tooltip="Revenue Bar" isLoading={loading}>
      {data ? (
        <MenuBarExtra.Section title={data.range.label}>
          <MenuBarExtra.Item
            title="Total"
            icon={Icon.BankNote}
            subtitle={menuBarTitle(data.combined.gross, data.combined.converted?.gross)}
            onAction={() => launchCommand({ name: "dashboard", type: LaunchType.UserInitiated })}
          />
          {showBreakdown
            ? data.results.map((result) =>
                result.ok ? (
                  <MenuBarExtra.Item
                    key={result.provider}
                    icon={providerIcon(result.provider)}
                    title={PROVIDER_LABELS[result.provider]}
                    subtitle={formatMoneyList(result.data.gross, "kpi")}
                    tooltip={`${result.data.count} sales`}
                    onAction={() => open(DASHBOARD_URLS[result.provider])}
                  />
                ) : (
                  <MenuBarExtra.Item
                    key={result.provider}
                    icon={Icon.ExclamationMark}
                    title={`Error: ${PROVIDER_LABELS[result.provider]}`}
                    subtitle={result.error.message}
                    onAction={revalidate}
                  />
                ),
              )
            : null}
        </MenuBarExtra.Section>
      ) : null}
      <Footer onRefresh={revalidate} />
    </MenuBarExtra>
  );
}
