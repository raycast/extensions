/**
 * `Conversas do Hermes` (UX-SPEC §2.2) — a lista.
 *
 * A tese do produto é que estas NÃO são "as conversas do Raycast": são as mesmas
 * conversas do Hermes Desktop, vistas de outro lugar. Por isso a origem de cada linha é
 * traduzida em etiqueta e explicada no tooltip (§8.2, item 6), o estado vazio diz como
 * começar a primeira, e o detalhe carrega a frase canônica da §10.3.
 *
 * Decisões de mecânica que sustentam isso:
 * - **paginação com `nextSessionOffset()`** (armadilha 8): linhas fixadas entram ALÉM do
 *   `limit` e `has_more` conta só as não fixadas, então `offset + limit` erraria a página;
 * - **polling de 4 s** (§8.5) que revalida a primeira página; páginas antigas ficam para
 *   Atualizar/manual, morre na desmontagem e pausa enquanto outra tela está empilhada;
 * - **busca client-side**, porque a API não tem parâmetro de busca (armadilha 42);
 * - **nada de transcrição em disco** (§8.7): o `Cache` de 30 s guarda só metadado da
 *   primeira página, e com o `preview` removido — ele é conteúdo da primeira mensagem.
 */

import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showHUD,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { NotConfigured } from "./components/first-run";
import { SHORTCUTS } from "./components/shortcuts";
import { HermesError, HermesNotConfiguredError, isAbort, toHermesError } from "./lib/errors";
import {
  deleteSession,
  forkSession,
  getSessionMessages,
  listSessions,
  nextSessionOffset,
  updateSession,
} from "./lib/hermes-api";
import { getHermesPreferences } from "./lib/preferences";
import { mergePolledFirstPage, type FeedSnapshot } from "./lib/session-feed";
import { CacheKeys, CacheTtl, cacheRead, cacheWrite } from "./lib/storage";
import type { Session } from "./lib/types";
import { compactConversationCount, compactMessageCount, compactModelLabel, truncateOneLine } from "./lib/ui-text";
import { NO_TITLE, OpenModelsAction, OpenPreferencesAction } from "./components/common";
import { RenameSessionForm } from "./components/rename-session-form";
import {
  CopySessionIdAction,
  HermesErrorEmptyView,
  OpenInHermesDesktopAction,
  SessionDetail,
  continueConversation,
  describeOrigin,
  startNewConversation,
} from "./session-detail";

/** UX-SPEC §8.5: a lista de conversas revalida a cada 4 s em primeiro plano. */
const LIST_POLL_MS = 4_000;

/* ─────────────────────────── Busca client-side ─────────────────────────── */

/** Sem acento e sem caixa: "Relatório" tem de casar com "relatorio". */
function foldForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/* ───────────────────────────── Feed paginado ───────────────────────────── */

const EMPTY_FEED: FeedSnapshot = { items: [], hasMore: false, nextOffset: 0, pages: 1 };

function dedupe(sessions: Session[]): Session[] {
  const seen = new Set<string>();
  const out: Session[] = [];
  for (const session of sessions) {
    if (seen.has(session.id)) continue;
    seen.add(session.id);
    out.push(session);
  }
  return out;
}

/**
 * Revalida a janela inteira em cargas inicial/manual. O polling periódico busca apenas a
 * primeira página; páginas antigas voltam a ser consultadas por Atualizar/manual.
 */
async function fetchWindow(pages: number, limit: number, signal: AbortSignal): Promise<FeedSnapshot> {
  const collected: Session[] = [];
  let offset = 0;
  let hasMore = false;
  let loaded = 0;

  for (let page = 0; page < pages; page += 1) {
    const response = await listSessions({ limit, offset, signal });
    collected.push(...response.data);
    offset = nextSessionOffset(offset, response);
    hasMore = response.has_more === true;
    loaded = page + 1;
    if (!hasMore) break;
  }

  return { items: dedupe(collected), hasMore, nextOffset: offset, pages: loaded };
}

/**
 * O `Cache` de 30 s existe só para a lista pintar na hora (§8.5). O `preview` sai antes de
 * gravar: ele são os ~60 primeiros caracteres da primeira mensagem, e conteúdo de mensagem
 * não é guardado em lugar nenhum (§8.7 / `storage.ts`). O subtítulo aparece na revalidação,
 * que chega em milissegundos porque o Hermes é local.
 */
function withoutPreviews(sessions: Session[]): Session[] {
  return sessions.map((session) => {
    const copy = { ...session };
    delete copy.preview;
    return copy;
  });
}

function readCachedFirstPage(): FeedSnapshot {
  const cached = cacheRead<Session[]>(CacheKeys.sessionsFirstPage, CacheTtl.sessionsFirstPage);
  if (cached === undefined || cached.length === 0) return EMPTY_FEED;
  return { items: cached, hasMore: false, nextOffset: 0, pages: 1 };
}

/* ──────────────────────────────── Comando ──────────────────────────────── */

export default function Command(): React.JSX.Element {
  const pageSize = useMemo(() => getHermesPreferences().maxHistoryItems, []);

  const [feed, setFeed] = useState<FeedSnapshot>(readCachedFirstPage);
  const [error, setError] = useState<HermesError | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const feedRef = useRef(feed);
  feedRef.current = feed;
  const mountedRef = useRef(true);
  const requestRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  /** O polling para enquanto outra tela está empilhada (§8.5, coluna "Regra de parada"). */
  const pausedRef = useRef(false);
  /** Evita uma chuva de toasts: só o primeiro erro de uma sequência de falhas aparece. */
  const pollFailingRef = useRef(false);

  const refresh = useCallback(
    async (mode: "initial" | "manual" | "poll") => {
      if (mode === "poll" && pausedRef.current) return;
      if (busyRef.current) return;
      busyRef.current = true;

      const controller = new AbortController();
      requestRef.current = controller;
      const alive = () => mountedRef.current && requestRef.current === controller && !controller.signal.aborted;
      if (mode !== "poll") setIsLoading(true);

      try {
        let next: FeedSnapshot;
        if (mode === "poll") {
          const response = await listSessions({ limit: pageSize, offset: 0, signal: controller.signal });
          // Leia o snapshot depois do await: ações otimistas podem ter alterado o feed
          // enquanto a requisição estava em voo.
          next = mergePolledFirstPage(feedRef.current, response);
        } else {
          next = await fetchWindow(Math.max(1, feedRef.current.pages), pageSize, controller.signal);
        }
        if (!alive()) return;
        setFeed(next);
        setError(undefined);
        pollFailingRef.current = false;
        cacheWrite(CacheKeys.sessionsFirstPage, withoutPreviews(next.items.slice(0, pageSize)));
      } catch (err) {
        if (isAbort(err) || !mountedRef.current) return;
        const mapped = toHermesError(err, "listSessions");
        // Falta de configuração NÃO é falha passageira: é o estado de primeiro uso, e tem
        // de levar à tela de onboarding sempre. A lista é semeada pelo cache (TTL de 30 s),
        // então sem esta exceção uma instalação sem chave mostrava a lista velha com um
        // Toast de erro, e a guarda de `HermesNotConfiguredError` mais abaixo nunca era
        // alcançada — o item 1 do checklist reprovava só neste comando.
        if (mapped instanceof HermesNotConfiguredError) {
          setError(mapped);
        } else if (feedRef.current.items.length > 0) {
          // Uma falha passageira não pode apagar a lista que o usuário está lendo (§5.3):
          // a tela cheia de erro é só para quando não há nada para mostrar.
          if (mode !== "poll" || !pollFailingRef.current) {
            await showToast({ style: Toast.Style.Failure, title: mapped.userMessage });
          }
          pollFailingRef.current = true;
        } else {
          setError(mapped);
        }
      } finally {
        if (requestRef.current === controller) {
          busyRef.current = false;
          if (mountedRef.current) setIsLoading(false);
        }
      }
    },
    [pageSize],
  );

  const loadMore = useCallback(() => {
    if (busyRef.current || !feedRef.current.hasMore) return;
    busyRef.current = true;

    const controller = new AbortController();
    requestRef.current = controller;
    const alive = () => mountedRef.current && requestRef.current === controller && !controller.signal.aborted;

    void (async () => {
      try {
        const current = feedRef.current;
        const response = await listSessions({ limit: pageSize, offset: current.nextOffset, signal: controller.signal });
        if (!alive()) return;
        setFeed({
          items: dedupe([...current.items, ...response.data]),
          hasMore: response.has_more === true,
          nextOffset: nextSessionOffset(current.nextOffset, response),
          pages: current.pages + 1,
        });
      } catch (err) {
        if (isAbort(err) || !mountedRef.current) return;
        await showToast({ style: Toast.Style.Failure, title: toHermesError(err, "listSessions").userMessage });
      } finally {
        if (requestRef.current === controller) busyRef.current = false;
      }
    })();
  }, [pageSize]);

  useEffect(() => {
    mountedRef.current = true;
    void refresh("initial");
    const timer = setInterval(() => void refresh("poll"), LIST_POLL_MS);

    // §11 da UX-SPEC: polling e requisições morrem com a tela, e nenhum `setState`
    // acontece depois. Sem isto, fechar a janela deixaria um timer batendo no Hermes.
    return () => {
      mountedRef.current = false;
      busyRef.current = false;
      clearInterval(timer);
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [refresh]);

  /* ──────────────── Atualização otimista de uma linha ──────────────── */

  const replaceSession = useCallback((updated: Session) => {
    setFeed((current) => ({
      ...current,
      items: current.items.map((session) => (session.id === updated.id ? updated : session)),
    }));
  }, []);

  const removeSession = useCallback((sessionId: string) => {
    setFeed((current) => ({ ...current, items: current.items.filter((session) => session.id !== sessionId) }));
  }, []);

  const pauseWhilePushed = useMemo(
    () => ({
      onPush: () => {
        pausedRef.current = true;
      },
      onPop: () => {
        pausedRef.current = false;
        void refresh("manual");
      },
    }),
    [refresh],
  );

  /* ─────────────────────────────── Ações ─────────────────────────────── */

  const togglePin = useCallback(
    async (session: Session) => {
      const pinned = session.pinned !== true;
      try {
        const { session: updated } = await updateSession(session.id, { pinned });
        replaceSession(updated);
        await showToast({
          style: Toast.Style.Success,
          title: pinned ? "Conversation pinned" : "Conversation unpinned",
        });
      } catch (err) {
        await showToast({ style: Toast.Style.Failure, title: toHermesError(err, "updateSession").userMessage });
      }
    },
    [replaceSession],
  );

  const archive = useCallback(
    async (session: Session) => {
      try {
        await updateSession(session.id, { archived: true });
        removeSession(session.id);
        await showToast({ style: Toast.Style.Success, title: "Conversation archived" });
      } catch (err) {
        await showToast({ style: Toast.Style.Failure, title: toHermesError(err, "updateSession").userMessage });
      }
    },
    [removeSession],
  );

  const fork = useCallback(
    async (session: Session) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Ramificando…" });
      try {
        const { session: child } = await forkSession(session.id);
        await refresh("manual");
        toast.style = Toast.Style.Success;
        toast.title = "New conversation created from this one";
        // §8.2: o filho é carimbado `source: "api_server"` pelo servidor e `source` não é
        // patchável (armadilha 7) — dizer isso é obrigatório, senão a promessa vira mentira.
        toast.message = "This new conversation does not show up in the main Hermes Desktop list.";
        toast.primaryAction = {
          title: "Open the New Conversation",
          onAction: (shown) => {
            void shown.hide();
            void continueConversation(child);
          },
        };
      } catch (err) {
        await toast.hide();
        await showToast({ style: Toast.Style.Failure, title: toHermesError(err, "forkSession").userMessage });
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (session: Session) => {
      const title = session.title ?? NO_TITLE;
      const confirmed = await confirmAlert({
        icon: Icon.Trash,
        title: "Delete this conversation?",
        message: `The conversation "${title}" will be removed from Hermes, including Hermes Desktop. This cannot be undone.`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
        dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
        // Nunca lembrar a escolha: um destrutivo lembrado vira um destrutivo silencioso.
        rememberUserChoice: false,
      });
      if (!confirmed) return;

      try {
        const result = await deleteSession(session.id);
        // O servidor pode responder `deleted: false`; não assumir sucesso pelo 200.
        if (result.deleted !== true) {
          await showToast({ style: Toast.Style.Failure, title: "Hermes could not delete this conversation." });
          await refresh("manual");
          return;
        }
        removeSession(session.id);
        await showToast({ style: Toast.Style.Success, title: "Conversation deleted" });
      } catch (err) {
        await showToast({ style: Toast.Style.Failure, title: toHermesError(err, "deleteSession").userMessage });
      }
    },
    [refresh, removeSession],
  );

  const copyLatestAnswer = useCallback(async (session: Session) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching the answer…" });
    try {
      // Sob demanda: a transcrição não fica guardada em lugar nenhum (§8.7).
      const page = await getSessionMessages(session.id, { limit: 10, order: "latest" });
      const answer = [...page.data]
        .sort((a, b) => a.id - b.id)
        .reverse()
        .find((message) => message.role === "assistant" && (message.content ?? "").trim() !== "");

      if (answer === undefined) {
        toast.style = Toast.Style.Failure;
        toast.title = "This conversation has no answer from Hermes yet.";
        return;
      }
      await toast.hide();
      await Clipboard.copy((answer.content ?? "").trim());
      await showHUD("Answer copied");
    } catch (err) {
      await toast.hide();
      await showToast({ style: Toast.Style.Failure, title: toHermesError(err, "getSessionMessages").userMessage });
    }
  }, []);

  /* ────────────────────────────── Render ────────────────────────────── */

  // `archived`/`hidden` saem da lista: é o que "some da lista" da §2.2 significa, e a API
  // não tem filtro para isso.
  const visible = useMemo(
    () => feed.items.filter((session) => session.archived !== true && session.hidden !== true),
    [feed.items],
  );

  const query = foldForSearch(searchText.trim());
  const filtered = useMemo(() => {
    if (query === "") return visible;
    return visible.filter((session) => foldForSearch(session.title ?? NO_TITLE).includes(query));
  }, [visible, query]);

  const pinned = filtered.filter((session) => session.pinned === true);
  const recent = filtered.filter((session) => session.pinned !== true);

  const renderItem = (session: Session): React.JSX.Element => {
    const origin = describeOrigin(session);
    const lastActive = session.last_active;
    const accessories: List.Item.Accessory[] = [
      {
        tag: { value: origin.tag, color: origin.visibleInDesktop ? Color.Green : Color.SecondaryText },
        tooltip: origin.tooltip,
      },
    ];
    if (typeof session.message_count === "number") {
      accessories.push({
        text: compactMessageCount(session.message_count),
        tooltip: "Messages in this conversation",
      });
    }
    if (typeof session.model === "string" && session.model !== "") {
      accessories.push({
        text: compactModelLabel(session.model),
        icon: Icon.ComputerChip,
        tooltip: `Model used in this conversation: ${session.model}`,
      });
    }
    if (typeof lastActive === "number" && lastActive > 0) {
      // `last_active` vem em SEGUNDOS: multiplicar é obrigatório, senão a data cai em 1970.
      accessories.push({ date: new Date(lastActive * 1000), tooltip: "Last activity" });
    }

    return (
      <List.Item
        key={session.id}
        id={session.id}
        icon={{ value: origin.icon, tooltip: origin.tooltip }}
        title={truncateOneLine(session.title?.trim() ? session.title : NO_TITLE, 60)}
        subtitle={session.preview ? truncateOneLine(session.preview, 96) : undefined}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {/* §12 do desenho da conversa contínua: abrir uma conversa passou a ser
                  CONTINUAR a conversa. O detalhe — que é um arquivo de mensagens, não uma
                  conversa — vira ação secundária, com o nome do que ele de fato é. */}
              <Action
                title="Continue This Conversation"
                icon={Icon.SpeechBubble}
                shortcut={SHORTCUTS.continueConversation}
                onAction={() => void continueConversation(session)}
              />
              <Action.Push
                title="See Messages and Tools"
                icon={Icon.WrenchScrewdriver}
                shortcut={SHORTCUTS.viewMessages}
                target={<SessionDetail session={session} onSessionChanged={replaceSession} />}
                {...pauseWhilePushed}
              />
            </ActionPanel.Section>

            <ActionPanel.Section>
              <OpenInHermesDesktopAction session={session} />
              <Action
                title="Copy the Latest Answer"
                icon={Icon.Clipboard}
                shortcut={SHORTCUTS.copy}
                onAction={() => void copyLatestAnswer(session)}
              />
              <CopySessionIdAction session={session} />
            </ActionPanel.Section>

            <ActionPanel.Section>
              <Action.Push
                title="Rename the Conversation"
                icon={Icon.Pencil}
                shortcut={SHORTCUTS.rename}
                target={<RenameSessionForm session={session} onRenamed={replaceSession} />}
                {...pauseWhilePushed}
              />
              <Action
                title={session.pinned === true ? "Unpin the Conversation" : "Pin the Conversation"}
                icon={session.pinned === true ? Icon.PinDisabled : Icon.Pin}
                shortcut={SHORTCUTS.pin}
                onAction={() => void togglePin(session)}
              />
              <Action
                title="Archive the Conversation"
                icon={Icon.Tray}
                shortcut={SHORTCUTS.archive}
                onAction={() => void archive(session)}
              />
              <Action
                title="Branch the Conversation"
                icon={Icon.Layers}
                shortcut={SHORTCUTS.branch}
                onAction={() => void fork(session)}
              />
              <Action
                title="Delete the Conversation"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={SHORTCUTS.remove}
                onAction={() => void remove(session)}
              />
            </ActionPanel.Section>

            <ActionPanel.Section>
              <Action
                title="New Conversation"
                icon={Icon.Plus}
                shortcut={SHORTCUTS.newConversation}
                onAction={() => void startNewConversation()}
              />
              <Action
                title="Refresh the List"
                icon={Icon.ArrowClockwise}
                shortcut={SHORTCUTS.refresh}
                onAction={() => void refresh("manual")}
              />
              <OpenModelsAction />
              <OpenPreferencesAction />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  // Guarda de configuração (§2, convenções): sem chave o comando NÃO tenta falar com o
  // Hermes — renderiza a tela de primeiro uso (§3.4) no lugar do conteúdo. O sinal chega
  // como `HermesNotConfiguredError` de `requireApiKey()`, antes de qualquer requisição.
  if (error instanceof HermesNotConfiguredError) {
    return <NotConfigured commandTitle="Hermes Conversations" onRetry={() => void refresh("manual")} />;
  }

  if (error !== undefined) {
    return (
      <List navigationTitle="Hermes Conversations" isLoading={false}>
        <HermesErrorEmptyView error={error} onRetry={() => void refresh("manual")} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Hermes Conversations"
      searchBarPlaceholder="Search conversations by title"
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      pagination={{ pageSize, hasMore: feed.hasMore, onLoadMore: loadMore }}
    >
      {query === "" ? (
        <List.EmptyView
          icon={Icon.SpeechBubble}
          title="No Conversation Around Here"
          // Primeira frase: literal da §2.2.2. Segunda: o estado vazio precisa dizer COMO
          // começar, não só que não há nada. A ação primária faz o que a frase promete.
          description="When you ask Hermes something, the conversation shows up in this list and in Hermes Desktop too. To start the first one, press Enter and write your question."
          actions={
            <ActionPanel>
              <Action title="Ask Hermes" icon={Icon.SpeechBubble} onAction={() => void startNewConversation()} />
              <Action
                title="Refresh the List"
                icon={Icon.ArrowClockwise}
                shortcut={SHORTCUTS.refresh}
                onAction={() => void refresh("manual")}
              />
              <OpenModelsAction />
              <OpenPreferencesAction />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Nothing Found"
          description="No conversation with that text in the title."
          actions={
            <ActionPanel>
              <Action
                title="New Conversation"
                icon={Icon.Plus}
                shortcut={SHORTCUTS.newConversation}
                onAction={() => void startNewConversation()}
              />
              <Action
                title="Refresh the List"
                icon={Icon.ArrowClockwise}
                shortcut={SHORTCUTS.refresh}
                onAction={() => void refresh("manual")}
              />
              <OpenModelsAction />
              <OpenPreferencesAction />
            </ActionPanel>
          }
        />
      )}

      {pinned.length > 0 ? (
        <List.Section title="Pinned" subtitle={compactConversationCount(pinned.length)}>
          {pinned.map(renderItem)}
        </List.Section>
      ) : null}

      {recent.length > 0 ? (
        <List.Section title="Recent" subtitle={compactConversationCount(recent.length)}>
          {recent.map(renderItem)}
        </List.Section>
      ) : null}
    </List>
  );
}
