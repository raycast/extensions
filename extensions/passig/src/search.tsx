import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  closeMainWindow,
  showHUD,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { displayHost, generateTotp, type DecryptedItem } from "./vendor/client-core/index.js";
import { UnlockForm } from "./components/UnlockForm";
import { copySecret } from "./lib/clipboard";
import { describeError } from "./lib/errors";
import { lockSession, type ActiveSession } from "./lib/session";
import { useSession } from "./lib/useSession";

export default function SearchCommand() {
  const { session, setSession, loading } = useSession();
  if (loading) return <List isLoading searchBarPlaceholder="Caricamento…" />;
  if (!session) return <UnlockForm onUnlocked={setSession} />;
  return <SearchList session={session} onLock={() => setSession(null)} />;
}

function SearchList({ session, onLock }: { session: ActiveSession; onLock: () => void }) {
  const [query, setQuery] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0); // forza il re-render dopo refresh
  const [refreshing, setRefreshing] = useState(false);

  // Aggiorna dal server in background all'apertura (gli item in cache si vedono subito).
  useEffect(() => {
    let cancelled = false;
    setRefreshing(true);
    session
      .refresh()
      .catch((err) => showToast({ style: Toast.Style.Failure, title: "Aggiornamento fallito", message: describeError(err) }))
      .finally(() => {
        if (!cancelled) {
          setRefreshing(false);
          setTick((t) => t + 1);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const results = useMemo(() => session.vault.search(query, 200), [session, query, tick]);
  const byVault = useMemo(() => {
    const groups = new Map<string, DecryptedItem[]>();
    for (const item of results) {
      const list = groups.get(item.vaultName) ?? [];
      list.push(item);
      groups.set(item.vaultName, list);
    }
    return [...groups.entries()];
  }, [results]);

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <List
      isLoading={refreshing}
      searchBarPlaceholder="Cerca per titolo, username o sito…"
      onSearchTextChange={setQuery}
      filtering={false}
      isShowingDetail={showDetail}
      throttle
    >
      {byVault.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={query ? "Nessun risultato" : "Nessun elemento nel vault"}
          description={query ? "Prova con un altro termine" : "Usa il comando «Salva password» per crearne uno"}
        />
      )}
      {byVault.map(([vaultName, items]) => (
        <List.Section key={vaultName} title={vaultName} subtitle={`${items.length}`}>
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              session={session}
              showDetail={showDetail}
              revealed={revealed.has(item.id)}
              onToggleDetail={() => setShowDetail((v) => !v)}
              onToggleReveal={() => toggleReveal(item.id)}
              onLock={onLock}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

interface RowProps {
  item: DecryptedItem;
  session: ActiveSession;
  showDetail: boolean;
  revealed: boolean;
  onToggleDetail: () => void;
  onToggleReveal: () => void;
  onLock: () => void;
}

const TYPE_ICON: Record<DecryptedItem["data"]["type"], Icon> = {
  login: Icon.Key,
  note: Icon.Document,
  card: Icon.CreditCard,
  identity: Icon.Person,
};

function ItemRow({ item, session, showDetail, revealed, onToggleDetail, onToggleReveal, onLock }: RowProps) {
  const d = item.data;
  const host = d.urls[0] ? displayHost(d.urls[0]) : undefined;

  async function copyPassword() {
    if (!d.password) {
      await showToast({ style: Toast.Style.Failure, title: "Nessuna password" });
      return;
    }
    await copySecret(d.password);
    await showHUD("Password copiata (si cancella tra 30 s)");
  }

  async function pastePassword() {
    if (!d.password) return;
    await closeMainWindow();
    await Clipboard.paste(d.password);
  }

  async function copyUsername() {
    if (!d.username) return;
    await Clipboard.copy(d.username);
    await showHUD("Username copiato");
  }

  async function copyTotp() {
    if (!d.totp) return;
    try {
      const { code, remaining } = await generateTotp(d.totp);
      await copySecret(code);
      await showHUD(`Codice ${code} copiato (valido ${remaining} s)`);
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: "TOTP non valido", message: describeError(err) });
    }
  }

  async function pasteTotp() {
    if (!d.totp) return;
    try {
      const { code } = await generateTotp(d.totp);
      await closeMainWindow();
      await Clipboard.paste(code);
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: "TOTP non valido", message: describeError(err) });
    }
  }

  async function lock() {
    lockSession();
    session.vault.lock();
    onLock();
    await showToast({ style: Toast.Style.Success, title: "Passig bloccato" });
  }

  return (
    <List.Item
      icon={{ source: TYPE_ICON[d.type], tintColor: d.favorite ? Color.Yellow : Color.PrimaryText }}
      title={d.title || "(senza titolo)"}
      subtitle={showDetail ? undefined : d.username}
      keywords={[d.username, ...d.urls.map(displayHost)].filter(Boolean)}
      accessories={
        showDetail
          ? undefined
          : [
              ...(d.totp ? [{ icon: Icon.Clock, tooltip: "TOTP disponibile" }] : []),
              ...(host ? [{ text: host, tooltip: d.urls.join("\n") }] : []),
            ]
      }
      detail={<ItemDetail item={item} revealed={revealed} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={d.title}>
            <Action title="Copia password" icon={Icon.Clipboard} onAction={copyPassword} />
            <Action
              title="Incolla password"
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              onAction={pastePassword}
            />
            <Action
              title="Copia username"
              icon={Icon.Person}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
              onAction={copyUsername}
            />
            {d.totp && (
              <Action title="Copia codice TOTP" icon={Icon.Clock} shortcut={{ modifiers: ["cmd"], key: "t" }} onAction={copyTotp} />
            )}
            {d.totp && (
              <Action
                title="Incolla codice TOTP"
                icon={Icon.Clock}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                onAction={pasteTotp}
              />
            )}
            {d.urls[0] && (
              <Action.OpenInBrowser
                title="Apri sito"
                url={/^[a-z]+:\/\//i.test(d.urls[0]) ? d.urls[0] : `https://${d.urls[0]}`}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={showDetail ? "Nascondi dettagli" : "Mostra dettagli"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={onToggleDetail}
            />
            <Action
              title={revealed ? "Nascondi password" : "Mostra password"}
              icon={revealed ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={onToggleReveal}
            />
            <Action
              title="Aggiorna dal server"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                try {
                  await session.refresh();
                  await showToast({ style: Toast.Style.Success, title: "Vault aggiornato" });
                } catch (err) {
                  await showToast({ style: Toast.Style.Failure, title: "Aggiornamento fallito", message: describeError(err) });
                }
              }}
            />
            <Action title="Blocca Passig" icon={Icon.Lock} shortcut={{ modifiers: ["cmd", "shift"], key: "l" }} onAction={lock} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ItemDetail({ item, revealed }: { item: DecryptedItem; revealed: boolean }) {
  const d = item.data;
  const [totp, setTotp] = useState<{ code: string; remaining: number } | null>(null);

  // Aggiorna il codice TOTP ogni secondo quando il dettaglio è visibile.
  useEffect(() => {
    if (!d.totp) return;
    let active = true;
    const update = () =>
      generateTotp(d.totp!)
        .then((t) => active && setTotp({ code: t.code, remaining: t.remaining }))
        .catch(() => active && setTotp(null));
    update();
    const timer = setInterval(update, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [d.totp]);

  const masked = d.password ? "•".repeat(Math.min(d.password.length, 16)) : "—";
  return (
    <List.Item.Detail
      markdown={d.notes ? `### Note\n\n${d.notes}` : undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Titolo" text={d.title} />
          <List.Item.Detail.Metadata.Label title="Vault" text={item.vaultName} />
          <List.Item.Detail.Metadata.Label title="Username" text={d.username || "—"} />
          <List.Item.Detail.Metadata.Label title="Password" text={revealed ? d.password || "—" : masked} icon={revealed ? Icon.Eye : Icon.EyeDisabled} />
          {d.totp && (
            <List.Item.Detail.Metadata.Label
              title="TOTP"
              text={totp ? `${totp.code}  (${totp.remaining} s)` : "non valido"}
              icon={Icon.Clock}
            />
          )}
          {d.urls.length > 0 && <List.Item.Detail.Metadata.Separator />}
          {d.urls.map((u, i) => (
            <List.Item.Detail.Metadata.Link key={i} title={i === 0 ? "URL" : ""} text={displayHost(u)} target={/^[a-z]+:\/\//i.test(u) ? u : `https://${u}`} />
          ))}
          {d.fields.length > 0 && <List.Item.Detail.Metadata.Separator />}
          {d.fields.map((f, i) => (
            <List.Item.Detail.Metadata.Label key={i} title={f.name} text={f.hidden && !revealed ? "••••••" : f.value} />
          ))}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Aggiornato" text={new Date(item.updatedAt).toLocaleString("it-IT")} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
