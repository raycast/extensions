import { Color, Icon, Keyboard, LaunchType, MenuBarExtra, launchCommand, openExtensionPreferences } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import "./hooks/locale";
import { t212ErrorInfo } from "./components/error-view";
import { getPrefs } from "./hooks/preferences";
import { usePortfolio } from "./hooks/usePortfolio";
import { formatPct, formatRelativeMinutes } from "./lib/format";
import { menuBarSummaryRows, menuBarTitle, shortTicker, topMovers, type MenuBarRow } from "./lib/portfolio";
import { isRateLimited } from "./lib/t212/client";

// Template-style glyph: tinted to the menu bar's text colour (black or white), transparent elsewhere.
const MENU_BAR_ICON = { source: "menubar.svg", tintColor: Color.PrimaryText };

const TONE_ICON: Record<NonNullable<MenuBarRow["tone"]>, { source: Icon; tintColor: Color }> = {
  up: { source: Icon.ArrowUp, tintColor: Color.Green },
  down: { source: Icon.ArrowDown, tintColor: Color.Red },
};

function openPortfolio(ticker?: string) {
  return launchCommand({
    name: "portfolio",
    type: LaunchType.UserInitiated,
    ...(ticker ? { context: { ticker } } : {}),
  });
}

export default function Command() {
  const { menuBarShowAmount } = getPrefs();
  const { view, isLoading, error, revalidate, updatedAt } = usePortfolio({ toastOnError: false });

  // Nothing saved yet and Trading 212 said "too many requests": wait what it asks (5 s if it doesn't
  // say) and try once more instead of showing the error until the next background refresh. Staying
  // "loading" meanwhile also keeps Raycast from unloading the background run before the retry.
  const retried = useRef(false);
  const [waiting, setWaiting] = useState(false);
  const revalidateRef = useRef(revalidate);
  revalidateRef.current = revalidate;
  useEffect(() => {
    if (view || !isRateLimited(error) || retried.current) return;
    retried.current = true;
    setWaiting(true);
    const timer = setTimeout(
      () => {
        setWaiting(false);
        revalidateRef.current();
      },
      Math.min(error.retryAfterMs ?? 5000, 10_000) + 500,
    );
    return () => clearTimeout(timer);
  }, [view, error]);
  const loading = isLoading || waiting;

  if (!view) {
    return (
      <MenuBarExtra icon={MENU_BAR_ICON} title="Trading 212" isLoading={loading}>
        {error && !waiting ? (
          <MenuBarExtra.Item title={t212ErrorInfo(error).title} icon={Icon.Warning} />
        ) : (
          <MenuBarExtra.Item title="Loading…" />
        )}
        <MenuBarExtra.Item title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra>
    );
  }

  const now = Date.now();
  const movers = topMovers(view);
  return (
    <MenuBarExtra icon={MENU_BAR_ICON} title={menuBarTitle(view, menuBarShowAmount)} isLoading={isLoading}>
      <MenuBarExtra.Section>
        {menuBarSummaryRows(view, now, { showBalance: !menuBarShowAmount }).map((row) => (
          <MenuBarExtra.Item
            key={row.title}
            icon={row.tone ? TONE_ICON[row.tone] : { source: Icon.Minus, tintColor: Color.SecondaryText }}
            title={row.title}
            subtitle={row.value}
            onAction={() => openPortfolio()}
          />
        ))}
      </MenuBarExtra.Section>
      {movers.length > 0 && (
        <MenuBarExtra.Section title="Top movers today">
          {movers.map((p) => (
            <MenuBarExtra.Item
              key={p.ticker}
              title={shortTicker(p.ticker)}
              subtitle={formatPct(p.todayPct ?? 0, { signed: true })}
              onAction={() => openPortfolio(p.ticker)}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Portfolio"
          icon={Icon.AppWindow}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => openPortfolio()}
        />
        <MenuBarExtra.Item
          title="Refresh"
          subtitle={updatedAt !== undefined ? `· ${formatRelativeMinutes(updatedAt, now)}` : undefined}
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
