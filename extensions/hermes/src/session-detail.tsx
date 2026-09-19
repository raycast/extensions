/**
 * Detalhe da conversa (UX-SPEC §2.3) — a transcrição — e as peças que ela divide com a
 * lista de conversas (§2.2).
 *
 * Por que as peças compartilhadas moram aqui: este é o módulo folha do par
 * `sessions.tsx` → `session-detail.tsx`. A lista já importa a tela; concentrar aqui o
 * renomear, o "continuar", a leitura de `source` e a tela de erro evita duplicar copy
 * literal da UX-SPEC em dois arquivos, que é exatamente como o vocabulário derivaria.
 *
 * Regras desta tela que não podem ser relaxadas:
 * - **transcrição nunca é persistida** (ARCHITECTURE §7 / §9.1 e UX-SPEC §8.7): o texto
 *   das mensagens vive só no estado do React e morre com a tela. Nada de `Cache`, nada
 *   de `LocalStorage`;
 * - **paginação de verdade**: 120 mensagens por vez com `order=latest` (armadilha 11), e
 *   o offset conta a partir da mensagem MAIS NOVA — por isso o próximo lote é sempre
 *   `offset = quantidade já carregada`;
 * - **o `session_id` da resposta manda** (armadilha 9): ele resolve continuações de
 *   compressão e pode diferir do id pedido;
 * - **o polling de 6 s morre na desmontagem** (§8.5), com `AbortController`, e nenhum
 *   `setState` acontece depois disso.
 */

import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  LaunchType,
  List,
  Toast,
  launchCommand,
  showHUD,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  NO_TITLE,
  OpenModelsAction,
  OpenPreferencesAction,
  SYNC_PROMISE,
  openHermesDesktop,
} from "./components/common";
import { AutoDetectAction } from "./components/first-run";
import { RenameSessionForm } from "./components/rename-session-form";
import { SHORTCUTS } from "./components/shortcuts";
import { hermesDesktopSessionUrl } from "./lib/discovery";
import { HermesAuthError, HermesError, isAbort, sanitizeTechnical, toHermesError } from "./lib/errors";
import { getSession, getSessionMessages } from "./lib/hermes-api";
import type { Session, SessionMessage } from "./lib/types";

/* ────────────────────────────── Constantes ────────────────────────────── */

/** UX-SPEC §2.3: 120 mensagens por página, sempre `order=latest`. */
const TRANSCRIPT_PAGE_SIZE = 120;
/** UX-SPEC §8.5: detalhe da conversa revalida a cada 6 s enquanto está em primeiro plano. */
const DETAIL_POLL_MS = 6_000;
/** UX-SPEC §8.6: janela em que outra superfície pode estar escrevendo na mesma conversa. */
const RECENT_DESKTOP_USE_MS = 30_000;
/** UX-SPEC §8.3: abaixo disso o Desktop ainda pode não ter recebido a conversa. */
const JUST_CREATED_MS = 5_000;
/** Teto do texto renderizado por mensagem: cada `setState` atravessa a ponte IPC (armadilha 55). */
const MAX_MESSAGE_CHARS = 6_000;

/** Nome do comando no manifest. Constante para não digitar a string em dois lugares. */
const ASK_COMMAND = "ask-hermes";

/* ───────────────────── Origem da conversa (§2.2, §8.2) ───────────────────── */

/**
 * O campo `source` bruto ("desktop", "api_server", "telegram"…) não significa nada para
 * quem usa. Esta função traduz origem em três coisas que a interface consegue mostrar: um
 * ícone, uma etiqueta curta e — o que realmente importa — se a conversa aparece na lista
 * principal do Hermes Desktop.
 *
 * Duas regras vêm da pesquisa, não de gosto: conversas criadas aqui têm id `raycast_…`
 * (prefixo de `newSessionId()`), e o Desktop **exclui** dos Recentes tudo que ele
 * classifica como plataforma de mensageria — inclusive `api_server`, que é o carimbo que
 * um fork recebe (armadilha 7 / R7).
 */
export interface SessionOrigin {
  readonly icon: Icon;
  readonly tag: string;
  readonly tooltip: string;
  /** `true` quando a conversa aparece em "Recentes" do Hermes Desktop. */
  readonly visibleInDesktop: boolean;
}

const RAYCAST_ID_PREFIX = "raycast_";
const DESKTOP_SOURCES: ReadonlySet<string> = new Set(["desktop", "cli", "dashboard", "hermes_browser"]);
const MESSAGING_SOURCES: ReadonlySet<string> = new Set(["telegram", "discord", "slack"]);

export function describeOrigin(session: Session): SessionOrigin {
  if (session.id.startsWith(RAYCAST_ID_PREFIX)) {
    return {
      icon: Icon.RaycastLogoNeg,
      tag: "Started in Raycast",
      tooltip: "You started this conversation in Raycast. It shows up in Hermes Desktop too.",
      visibleInDesktop: true,
    };
  }

  const source = session.source ?? "";
  if (DESKTOP_SOURCES.has(source)) {
    return {
      icon: Icon.Desktop,
      tag: "From Hermes Desktop",
      tooltip: "This is the same conversation you see in Hermes Desktop.",
      visibleInDesktop: true,
    };
  }
  if (MESSAGING_SOURCES.has(source)) {
    return {
      icon: Icon.Message,
      tag: "From a messaging app",
      tooltip: "This conversation started in another app connected to Hermes.",
      visibleInDesktop: false,
    };
  }
  return {
    icon: Icon.QuestionMarkCircle,
    tag: "Created by another program",
    tooltip: "This conversation does not show up in the main Hermes Desktop list.",
    visibleInDesktop: false,
  };
}

export function syncLabel(origin: SessionOrigin): string {
  return origin.visibleInDesktop ? "Shows up in Hermes Desktop" : "Does not show up in the main Hermes Desktop list";
}

/* ─────────────────────────── Formatação de data ─────────────────────────── */

const dayFormatter = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long" });
const dayWithYearFormatter = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" });
const timestampFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "short" });
const preciseFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "medium" });

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "Hoje", "Ontem" ou "12 de agosto" (§10.1: data por extenso curto). */
function dayLabel(date: Date, now = new Date()): string {
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.getFullYear() === now.getFullYear() ? dayFormatter.format(date) : dayWithYearFormatter.format(date);
}

/** `last_active`, `started_at` e `timestamp` vêm em SEGUNDOS (float), nunca em ms. */
function toDate(epochSeconds: number | null | undefined): Date | undefined {
  if (typeof epochSeconds !== "number" || !Number.isFinite(epochSeconds) || epochSeconds <= 0) return undefined;
  return new Date(epochSeconds * 1000);
}

/* ─────────────────────── Ir para o fluxo de perguntas ─────────────────────── */

/** "exibir uma vez" da §8.6: um aviso por conversa por execução do comando. */
const warnedAboutRecentUse = new Set<string>();

export function shouldWarnAboutRecentDesktopUse(session: Session): boolean {
  if (session.id.startsWith(RAYCAST_ID_PREFIX)) return false;
  const lastActive = toDate(session.last_active);
  if (lastActive === undefined) return false;
  if (Date.now() - lastActive.getTime() > RECENT_DESKTOP_USE_MS) return false;
  if (warnedAboutRecentUse.has(session.id)) return false;
  warnedAboutRecentUse.add(session.id);
  return true;
}

async function openAskCommand(context?: Record<string, unknown>): Promise<void> {
  try {
    await launchCommand({ name: ASK_COMMAND, type: LaunchType.UserInitiated, context });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open the question screen.",
      message: 'Search for "Ask Hermes" in Raycast.',
    });
  }
}

/**
 * `Continuar esta conversa` — leva o fluxo de perguntas para ESTA conversa, entregando o
 * `session_id` no contexto de lançamento. É o mesmo `session_id` que o Hermes Desktop usa,
 * então a continuação entra no mesmo histórico dos dois lados (D-01).
 */
export async function continueConversation(session: Session): Promise<void> {
  const warn = shouldWarnAboutRecentDesktopUse(session);
  if (warn) {
    // §8.6 manda avisar e NÃO bloquear. Toast sem `style` é o único aviso não-modal do
    // Raycast: `Failure` seria vermelho e leria como "deu erro", que não é o caso.
    await showToast({
      title: "This conversation was used in Hermes Desktop a moment ago",
      message: "If it is open there, wait for that answer to finish before going on here.",
    });
  }
  await openAskCommand({
    sessionId: session.id,
    sessionTitle: session.title ?? undefined,
    avisoUsoRecente: warn,
  });
}

/** `Nova conversa` — a conversa só nasce junto do primeiro envio (R4), então aqui só abrimos o formulário. */
export function startNewConversation(): Promise<void> {
  return openAskCommand();
}

/* ──────────────────────── Ações reaproveitadas ──────────────────────── */

export function OpenInHermesDesktopAction({ session }: { session: Session }): React.JSX.Element | null {
  const url = hermesDesktopSessionUrl(session.id);
  // `undefined` significa id não linkável: a ação SOME, nunca abre um link quebrado (§2.2).
  if (url === undefined) return null;

  const createdAt = toDate(session.started_at);
  const justCreated = createdAt !== undefined && Date.now() - createdAt.getTime() < JUST_CREATED_MS;

  return (
    <Action.Open
      title="Open in Hermes Desktop"
      icon={Icon.Desktop}
      target={url}
      shortcut={SHORTCUTS.openInDesktop}
      onOpen={() => {
        // §8.3: a propagação leva de 1 a 3 s. Não prometemos "instantâneo" nem mostramos número.
        if (justCreated) {
          void showHUD("Opening in Hermes Desktop. It can take a few seconds for the conversation to show up there.");
        }
      }}
    />
  );
}

/** Mitigação da §8.4: o `hermes://` pode não estar registrado e o sistema não avisa. */
export function CopySessionIdAction({ session }: { session: Session }): React.JSX.Element {
  return (
    <Action
      title="Copy the Conversation ID"
      icon={Icon.Clipboard}
      onAction={async () => {
        await Clipboard.copy(session.id);
        await showHUD("Identifier copied");
      }}
    />
  );
}

/* ────────────────────────── Erro em tela cheia (§5) ────────────────────────── */

function technicalBlock(error: HermesError): string {
  const lines: string[] = [];
  if (error.httpStatus !== undefined) lines.push(`Answer: ${error.httpStatus}`);
  if (error.code !== null) lines.push(`Code: ${error.code}`);
  lines.push(`Moment: ${preciseFormatter.format(new Date())}`);
  lines.push(error.technical);
  // `technical` já sai redigido do construtor; a UX-SPEC §5.1 regra 5 exige que o filtro
  // nunca seja pulado, então o bloco montado passa de novo antes de ser exibido ou copiado.
  return sanitizeTechnical(lines.join("\n"));
}

function TechnicalDetailsView({ error }: { error: HermesError }): React.JSX.Element {
  const block = technicalBlock(error);
  return (
    <Detail
      navigationTitle="Technical Details"
      markdown={["### Technical details", "", "```", block, "```"].join("\n")}
      actions={
        <ActionPanel>
          <Action
            title="Copy Technical Details"
            icon={Icon.Clipboard}
            shortcut={SHORTCUTS.copyTechnical}
            onAction={async () => {
              await Clipboard.copy(block);
              await showHUD("Details copied");
            }}
          />
        </ActionPanel>
      }
    />
  );
}

/** Quebra "Frase um. Frase dois." em título e descrição, preservando o literal da §5.2. */
function splitMessage(message: string): { title: string; description?: string } {
  const cut = message.indexOf(". ");
  if (cut === -1) return { title: message };
  return { title: message.slice(0, cut), description: message.slice(cut + 2) };
}

/**
 * Erro que impede a tela inteira (§5.3). Em `List` a superfície correta é `EmptyView`.
 *
 * "Sem chave" NÃO passa por aqui: é o primeiro uso (§3.4) e quem cuida dele é
 * `components/first-run.tsx`, chamado antes de renderizar a lista.
 *
 * Ordem das ações fixada pela §5.1 regra 3: `Tentar novamente`, `Open Settings`,
 * `Copiar detalhes técnicos` — com o detalhe técnico oculto atrás de
 * `Mostrar detalhes técnicos` (regra 4) e sempre redigido (regra 5).
 *
 * E2 ganha `Detectar configuração automaticamente` como PRIMEIRA ação — é o que a §5.2 já
 * mandava e o código não fazia. Sem ela, uma chave trocada pelo Hermes exigia um
 * `Tentar novamente` só para o 401 apagar a chave detectada e a tela virar `NotConfigured`:
 * o caminho existia, mas custava um passo que não explicava nada.
 *
 * Nos outros erros a ação fica FORA, de propósito. Em E1 o Hermes está desligado e detectar
 * falharia igual; num 500 detectar não conserta nada. Oferecer o remédio errado é pior do
 * que não oferecer remédio.
 */
export function HermesErrorEmptyView({
  error,
  onRetry,
}: {
  error: HermesError;
  onRetry: () => void;
}): React.JSX.Element {
  const copy = splitMessage(error.userMessage);
  const keyWasRejected = error instanceof HermesAuthError || error.uxId === "E2";

  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={copy.title}
      description={copy.description}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {/* §5.2 E2: quando a chave foi recusada, detectar de novo é a ação primária. */}
            {keyWasRejected ? <AutoDetectAction onDone={onRetry} /> : null}
            <Action title="Try Again" icon={Icon.ArrowClockwise} shortcut={SHORTCUTS.refresh} onAction={onRetry} />
            <OpenPreferencesAction />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Show Technical Details"
              icon={Icon.Code}
              shortcut={SHORTCUTS.showTechnical}
              target={<TechnicalDetailsView error={error} />}
            />
            <Action
              title="Copy Technical Details"
              icon={Icon.Clipboard}
              shortcut={SHORTCUTS.copyTechnical}
              onAction={async () => {
                await Clipboard.copy(technicalBlock(error));
                await showHUD("Details copied");
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/* ───────────────────────── Mensagens → markdown ───────────────────────── */

function roleLabel(message: SessionMessage): string {
  switch (message.role) {
    case "user":
      return "You";
    case "assistant":
      return "Hermes";
    case "tool":
      return `Tool: ${message.tool_name ?? "unnamed"}`;
    case "system":
      return "Hermes instructions";
    default:
      return "Mensagem";
  }
}

function roleIcon(message: SessionMessage): Icon {
  switch (message.role) {
    case "user":
      return Icon.Person;
    case "assistant":
      return Icon.Stars;
    case "tool":
      return Icon.WrenchScrewdriver;
    default:
      return Icon.Gear;
  }
}

/** `user` e `assistant` são "a conversa"; `tool` e `system` só aparecem no modo completo (§2.3). */
function isConversationMessage(message: SessionMessage): boolean {
  return message.role === "user" || message.role === "assistant";
}

function clamp(text: string): string {
  if (text.length <= MAX_MESSAGE_CHARS) return text;
  return `${text.slice(0, MAX_MESSAGE_CHARS)}\n\n_Long message: showing only the beginning._`;
}

/** Cerca maior que a maior sequência de crases do conteúdo, senão o bloco vaza. */
function codeFence(text: string): string {
  let longest = 0;
  for (const run of text.match(/`+/g) ?? []) longest = Math.max(longest, run.length);
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}\n${text}\n${fence}`;
}

function firstLine(text: string | undefined): string {
  const cleaned = (text ?? "").replace(/\s+/g, " ").trim();
  return cleaned.length > 120 ? `${cleaned.slice(0, 120)}…` : cleaned;
}

function messageMarkdown(message: SessionMessage): string {
  const blocks: string[] = [];
  const content = (message.content ?? "").trim();

  if (content === "") {
    blocks.push("_This message has no text._");
  } else if (message.role === "tool" || message.role === "system") {
    // Resultado de ferramenta é dado, não prosa: em bloco, sem o markdown interpretar nada.
    blocks.push(codeFence(clamp(content)));
  } else {
    blocks.push(clamp(content));
  }

  const calls = message.tool_calls ?? [];
  if (calls.length > 0) {
    blocks.push("**Tools used in this message**");
    for (const call of calls) {
      blocks.push(`- ${call.function.name}`);
      const args = (call.function.arguments ?? "").trim();
      if (args !== "" && args !== "{}") blocks.push(codeFence(clamp(args)));
    }
  }

  return blocks.join("\n\n");
}

function messagePlainText(message: SessionMessage): string {
  const content = (message.content ?? "").trim();
  return content === "" ? "(no text)" : content;
}

function transcriptText(session: Session, messages: SessionMessage[], truncated: boolean): string {
  const lines: string[] = [session.title ?? NO_TITLE, ""];
  if (truncated) lines.push("(The older part of this conversation is not available here.)", "");
  for (const message of messages) {
    lines.push(`${roleLabel(message)}:`, messagePlainText(message), "");
  }
  return lines.join("\n");
}

/* ─────────────────────────── Estado da transcrição ─────────────────────────── */

/** Ordenação real é por `id` (autoincrement), nunca por `timestamp`. */
function mergeMessages(current: SessionMessage[], incoming: SessionMessage[]): SessionMessage[] {
  const byId = new Map<number, SessionMessage>();
  for (const message of current) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

interface DayGroup {
  key: string;
  label: string;
  messages: SessionMessage[];
}

function groupByDay(messages: SessionMessage[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const now = new Date();
  for (const message of messages) {
    const date = toDate(message.timestamp);
    const key = date === undefined ? "sem-data" : String(startOfDay(date));
    const label = date === undefined ? "No date" : dayLabel(date, now);
    const last = groups[groups.length - 1];
    if (last !== undefined && last.key === key) last.messages.push(message);
    else groups.push({ key, label, messages: [message] });
  }
  return groups;
}

/* ──────────────────────────── A tela (§2.3) ──────────────────────────── */

/**
 * O que basta para abrir esta tela: o `id`. Quem vem da lista de conversas já tem a linha
 * inteira e a entrega; quem vem da conversa (`Ver mensagens e ferramentas`) tem só o id e o
 * título, e os dois campos derivados (`has_system_prompt`, `has_model_config`) chegam no
 * primeiro `getSession`, que acontece na montagem — antes de qualquer coisa ser exibida a
 * partir deles.
 */
export type SessionSeed = Pick<Session, "id"> & Partial<Session>;

export function SessionDetail({
  session,
  onSessionChanged,
}: {
  session: SessionSeed;
  onSessionChanged?: (session: Session) => void;
}): React.JSX.Element {
  const [info, setInfo] = useState<Session>({ has_system_prompt: false, has_model_config: false, ...session });
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<HermesError | undefined>(undefined);
  const [scope, setScope] = useState<"conversa" | "tudo">("conversa");

  /** Id EFETIVO: `GET .../messages` pode resolver uma continuação de compressão (armadilha 9). */
  const sessionIdRef = useRef(session.id);
  const messagesRef = useRef<SessionMessage[]>([]);
  const messageCountRef = useRef<number | undefined>(session.message_count);
  const mountedRef = useRef(true);
  const requestRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const onChangedRef = useRef(onSessionChanged);
  onChangedRef.current = onSessionChanged;

  const refresh = useCallback(async (mode: "initial" | "manual" | "poll") => {
    if (busyRef.current) return;
    busyRef.current = true;

    const controller = new AbortController();
    requestRef.current = controller;
    const alive = () => mountedRef.current && requestRef.current === controller && !controller.signal.aborted;
    if (mode !== "poll") setIsLoading(true);

    try {
      // O metadado é barato; a transcrição só é rebuscada quando o número de mensagens mudou.
      const { session: fresh } = await getSession(sessionIdRef.current, controller.signal);
      if (!alive()) return;
      setInfo(fresh);
      onChangedRef.current?.(fresh);

      const count = fresh.message_count ?? 0;
      const needsMessages = mode !== "poll" || messagesRef.current.length === 0 || count !== messageCountRef.current;
      messageCountRef.current = count;

      if (needsMessages) {
        const page = await getSessionMessages(sessionIdRef.current, {
          limit: TRANSCRIPT_PAGE_SIZE,
          offset: 0,
          order: "latest",
          signal: controller.signal,
        });
        if (!alive()) return;
        if (page.session_id !== "") sessionIdRef.current = page.session_id;
        const merged = mergeMessages(messagesRef.current, page.data);
        messagesRef.current = merged;
        setMessages(merged);
        // Só a primeira leitura decide se existe histórico anterior; depois quem manda é `loadOlder`.
        if (mode === "initial") setHasOlder(page.pagination.returned >= TRANSCRIPT_PAGE_SIZE);
      }
      setError(undefined);
    } catch (err) {
      if (isAbort(err) || !mountedRef.current) return;
      const mapped = toHermesError(err, "sessionDetail");
      // Falha passageira no polling não apaga o que o usuário já está lendo (§5.3) —
      // EXCETO E7: se a conversa foi apagada (talvez no próprio Hermes Desktop), seguir
      // mostrando a transcrição seria mentir sobre algo que não existe mais.
      const conversationIsGone = mapped.code === "session_not_found";
      if (mode === "poll" && messagesRef.current.length > 0 && !conversationIsGone) return;
      setError(mapped);
    } finally {
      if (requestRef.current === controller) {
        busyRef.current = false;
        if (mountedRef.current) setIsLoading(false);
      }
    }
  }, []);

  const loadOlder = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    const controller = new AbortController();
    requestRef.current = controller;
    const alive = () => mountedRef.current && requestRef.current === controller && !controller.signal.aborted;
    setIsLoading(true);

    try {
      // `order=latest` conta o offset a partir da mensagem MAIS NOVA (armadilha 11): como
      // tudo o que temos é contíguo a partir dela, o próximo lote começa exatamente aqui.
      const page = await getSessionMessages(sessionIdRef.current, {
        limit: TRANSCRIPT_PAGE_SIZE,
        offset: messagesRef.current.length,
        order: "latest",
        signal: controller.signal,
      });
      if (!alive()) return;
      if (page.session_id !== "") sessionIdRef.current = page.session_id;
      const merged = mergeMessages(messagesRef.current, page.data);
      messagesRef.current = merged;
      setMessages(merged);
      setHasOlder(page.pagination.returned >= TRANSCRIPT_PAGE_SIZE);
    } catch (err) {
      if (isAbort(err) || !mountedRef.current) return;
      await showToast({ style: Toast.Style.Failure, title: toHermesError(err, "loadOlder").userMessage });
    } finally {
      if (requestRef.current === controller) {
        busyRef.current = false;
        if (mountedRef.current) setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh("initial");
    const timer = setInterval(() => void refresh("poll"), DETAIL_POLL_MS);

    // §8.5 / §11: o polling morre com a tela e nada mais escreve estado depois disso.
    return () => {
      mountedRef.current = false;
      busyRef.current = false;
      clearInterval(timer);
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [refresh]);

  const origin = useMemo(() => describeOrigin(info), [info]);
  const title = info.title ?? NO_TITLE;
  const visible = useMemo(
    () => (scope === "tudo" ? messages : messages.filter(isConversationMessage)),
    [messages, scope],
  );
  const groups = useMemo(() => groupByDay(visible), [visible]);
  // Armadilha 12: sem `include_compacted`, a transcrição termina na fronteira da compactação.
  const historyTruncated = !hasOlder && messages.length < (info.message_count ?? 0);

  const actions = useCallback(
    (message?: SessionMessage) => (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title="Continue This Conversation"
            icon={Icon.SpeechBubble}
            shortcut={SHORTCUTS.continueConversation}
            onAction={() => void continueConversation(info)}
          />
          {message !== undefined ? (
            <Action
              title="Copy the Message"
              icon={Icon.Clipboard}
              shortcut={SHORTCUTS.copy}
              onAction={async () => {
                await Clipboard.copy(messagePlainText(message));
                await showHUD("Message copied");
              }}
            />
          ) : null}
          {/* `Ctrl+Alt+C`: a §9.2 dá esse atalho a "Copy Technical Details" E a
              "Copy the Whole Conversation" — os dois nunca aparecem na mesma tela (§9.3).
              A §8.4 pede o mesmo atalho para "Copy the Conversation ID"; aí a
              tabela de teclado prevalece e o identificador fica só no painel. */}
          <Action
            title="Copy the Whole Conversation"
            icon={Icon.CopyClipboard}
            shortcut={SHORTCUTS.copyTechnical}
            onAction={async () => {
              await Clipboard.copy(transcriptText(info, messages, historyTruncated));
              await showHUD("Conversation copied");
            }}
          />
        </ActionPanel.Section>

        <ActionPanel.Section>
          <OpenInHermesDesktopAction session={info} />
          <CopySessionIdAction session={info} />
          <OpenModelsAction />
        </ActionPanel.Section>

        <ActionPanel.Section>
          <Action.Push
            title="Rename the Conversation"
            icon={Icon.Pencil}
            shortcut={SHORTCUTS.rename}
            target={
              <RenameSessionForm
                session={info}
                onRenamed={(updated) => {
                  setInfo(updated);
                  onChangedRef.current?.(updated);
                }}
              />
            }
          />
          {hasOlder ? (
            <Action
              title="Load the Earlier Part of the Conversation"
              icon={Icon.ArrowUp}
              shortcut={SHORTCUTS.loadOlder}
              onAction={() => void loadOlder()}
            />
          ) : null}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={SHORTCUTS.refresh}
            onAction={() => void refresh("manual")}
          />
          <OpenPreferencesAction />
        </ActionPanel.Section>
      </ActionPanel>
    ),
    [hasOlder, historyTruncated, info, loadOlder, messages, refresh],
  );

  if (error !== undefined) {
    return (
      <List navigationTitle={title} isLoading={false}>
        <HermesErrorEmptyView error={error} onRetry={() => void refresh("manual")} />
      </List>
    );
  }

  const desktopUrl = hermesDesktopSessionUrl(info.id);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={visible.length > 0}
      navigationTitle={title}
      searchBarPlaceholder="Search in this conversation"
      searchBarAccessory={
        <List.Dropdown
          tooltip="What to Show"
          value={scope}
          onChange={(next) => setScope(next === "tudo" ? "tudo" : "conversa")}
        >
          <List.Dropdown.Item title="Conversation Only" value="conversa" icon={Icon.SpeechBubble} />
          <List.Dropdown.Item title="Conversation and Tools" value="tudo" icon={Icon.WrenchScrewdriver} />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.SpeechBubble}
        title={isLoading ? "Loading the Conversation" : "Nothing to Show Here"}
        description={
          isLoading
            ? "Fetching the messages of this conversation from Hermes."
            : scope === "conversa" && messages.length > 0
              ? 'This part of the conversation has only tool steps. Choose "Conversation and Tools" to see them.'
              : `Carry on with the conversation so Hermes can answer. ${SYNC_PROMISE}`
        }
        actions={actions()}
      />

      {hasOlder ? (
        <List.Section>
          <List.Item
            icon={Icon.ArrowUp}
            title="Load the Earlier Part of the Conversation"
            subtitle={`Brings the ${TRANSCRIPT_PAGE_SIZE} messages before these.`}
            detail={
              <List.Item.Detail
                markdown={`This conversation has more messages than the ${messages.length} loaded here.`}
              />
            }
            actions={actions()}
          />
        </List.Section>
      ) : null}

      {groups.map((group) => (
        <List.Section key={group.key} title={group.label} subtitle={`${group.messages.length}`}>
          {group.messages.map((message) => {
            const when = toDate(message.timestamp);
            return (
              <List.Item
                key={message.id}
                icon={roleIcon(message)}
                title={roleLabel(message)}
                subtitle={firstLine(message.content)}
                accessories={
                  when === undefined ? undefined : [{ date: when, tooltip: timestampFormatter.format(when) }]
                }
                detail={
                  <List.Item.Detail
                    markdown={messageMarkdown(message)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="Who"
                          text={roleLabel(message)}
                          icon={roleIcon(message)}
                        />
                        {when === undefined ? null : (
                          <List.Item.Detail.Metadata.Label title="When" text={timestampFormatter.format(when)} />
                        )}
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Conversation" text={title} />
                        <List.Item.Detail.Metadata.TagList title="Origin">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={origin.tag}
                            icon={origin.icon}
                            color={origin.visibleInDesktop ? Color.Green : Color.SecondaryText}
                          />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Label title="Sync" text={syncLabel(origin)} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={actions(message)}
              />
            );
          })}
        </List.Section>
      ))}

      {/* As seções auxiliares só aparecem quando há mensagem visível. Sem esta guarda o
          `List.EmptyView` acima era inalcançável: a seção "Hermes Desktop" logo abaixo
          entrava em toda conversa cujo id fosse linkável — ou seja, em praticamente todas —
          e uma lista com um item nunca é uma lista vazia. `isShowingDetail={visible.length > 0}`
          mostra que o caso zero estava previsto; faltava deixá-lo acontecer.
          "Carregar parte anterior" fica FORA da guarda de propósito: quando o trecho atual
          só tem passos de ferramenta, ela é a única saída útil, e escondê-la criaria um
          beco sem saída. */}
      {historyTruncated && visible.length > 0 ? (
        <List.Section>
          <List.Item
            icon={Icon.Clock}
            title="The Older Part of This Conversation Is Not Available Here"
            subtitle="Open it in Hermes Desktop to see the whole thing."
            detail={
              <List.Item.Detail
                markdown={[
                  "Hermes compacts long conversations so they fit the model memory.",
                  "",
                  `This screen shows ${messages.length} of ${info.message_count ?? 0} messages. The rest is still in Hermes Desktop.`,
                ].join("\n")}
              />
            }
            actions={actions()}
          />
        </List.Section>
      ) : null}

      {desktopUrl === undefined || visible.length === 0 ? null : (
        <List.Section title="Hermes Desktop">
          <List.Item
            icon={Icon.Desktop}
            title="Open This Conversation in Hermes Desktop"
            subtitle="If nothing opens, check that Hermes Desktop is installed and running."
            accessories={[
              { tag: { value: origin.tag, color: origin.visibleInDesktop ? Color.Green : Color.SecondaryText } },
            ]}
            detail={<List.Item.Detail markdown={`${SYNC_PROMISE}\n\n${syncLabel(origin)}.`} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Open in Hermes Desktop"
                    icon={Icon.Desktop}
                    shortcut={SHORTCUTS.openInDesktop}
                    onAction={async () => {
                      const createdAt = toDate(info.started_at);
                      if (createdAt !== undefined && Date.now() - createdAt.getTime() < JUST_CREATED_MS) {
                        await showHUD(
                          "Opening in Hermes Desktop. It can take a few seconds for the conversation to show up there.",
                        );
                      }
                      await openHermesDesktop(desktopUrl);
                    }}
                  />
                  <CopySessionIdAction session={info} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Continue This Conversation"
                    icon={Icon.SpeechBubble}
                    shortcut={SHORTCUTS.continueConversation}
                    onAction={() => void continueConversation(info)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={SHORTCUTS.refresh}
                    onAction={() => void refresh("manual")}
                  />
                  <OpenPreferencesAction />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
