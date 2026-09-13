/**
 * `Modelos do Hermes` (UX-SPEC §2.6).
 *
 * A tela existe para UMA coisa que nenhuma outra faz: escrever `StorageKeys.defaultModel` e
 * `StorageKeys.nextTurnModel`. Esses dois valores são os degraus 2 e 3 da precedência P3
 * lida em `use-run-stream.ts#resolveModelChoice`; sem esta tela ninguém os grava e a
 * precedência inteira é código morto — junto com o "override por tarefa sem alterar o
 * default global" que o brief pede no MVP #5.
 *
 * O QUE ESTA TELA NÃO FAZ: mudar o modelo do Hermes. Não existe rota para isso no API
 * Server (02 §6.6). O que ela grava vale só para os comandos desta extensão, e a §2.6 exige
 * dizer isso em voz alta — é a confusão mais provável da tela.
 */

import { Action, ActionPanel, Color, Icon, List, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useCallback, useEffect, useState, type ReactElement } from "react";

import { NotConfigured } from "./components/first-run";
import { statusImage } from "./components/run-progress";
import { SHORTCUTS } from "./components/shortcuts";
import { HermesError, isAbort, toHermesError } from "./lib/errors";
import { getModelOptions } from "./lib/hermes-api";
import { isConfigured } from "./lib/preferences";
import { NO_CONNECTION } from "./lib/status";
import { CacheKeys, CacheTtl, StorageKeys, cacheWrite, cachedFetch, readJson, writeJson } from "./lib/storage";
import type { ModelCapability, ModelOptionsResponse, ModelPricing, ProviderOption } from "./lib/types";

const COMMAND_TITLE = "Hermes Models";

/** §2.6, texto obrigatório de esclarecimento — vai no título da primeira seção. */
const SCOPE_NOTE = "The default picked here applies only to the Raycast extension. Hermes Desktop keeps its own model.";

/** O que `resolveModelChoice()` lê do LocalStorage (P3, degraus 2 e 3). */
interface ModelChoice {
  provider?: string;
  model?: string;
}

function sameChoice(choice: ModelChoice | undefined, provider: string, model: string): boolean {
  return choice?.provider === provider && choice?.model === model;
}

/** §2.6: os preços vêm do servidor como STRINGS prontas ("$3.00", "free"), nunca números. */
function priceLine(pricing: ModelPricing | undefined): string | undefined {
  if (pricing === undefined) return undefined;
  return `in ${pricing.input} · out ${pricing.output}`;
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

/* ══════════════════════════════════ Comando ══════════════════════════════════ */

export default function Command(): ReactElement {
  const [configured, setConfigured] = useState<boolean | undefined>(undefined);
  const [check, setCheck] = useState(0);

  const [payload, setPayload] = useState<ModelOptionsResponse | undefined>(undefined);
  const [error, setError] = useState<HermesError | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  /** Escolhas gravadas, só para dizer ao usuário o que está valendo agora. */
  const [defaultChoice, setDefaultChoice] = useState<ModelChoice | undefined>(undefined);
  const [nextTurnChoice, setNextTurnChoice] = useState<ModelChoice | undefined>(undefined);
  const [nonce, setNonce] = useState(0);
  /** `true` no `Atualizar lista`: re-sonda TODOS os provedores e é lento (§2.6). */
  const [forceRefresh, setForceRefresh] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isConfigured().then((value) => {
      if (!cancelled) setConfigured(value);
    });
    return () => {
      cancelled = true;
    };
  }, [check]);

  const reloadChoices = useCallback(async (): Promise<void> => {
    setDefaultChoice(await readJson<ModelChoice>(StorageKeys.defaultModel));
    setNextTurnChoice(await readJson<ModelChoice>(StorageKeys.nextTurnModel));
  }, []);

  useEffect(() => {
    if (configured !== true) return;
    let cancelled = false;
    const controller = new AbortController();

    void (async () => {
      setIsLoading(true);
      const toast = forceRefresh
        ? // §2.6: a chamada com `refresh=true` re-sonda todos os provedores; sem o Toast
          // animado a tela pareceria travada por dezenas de segundos.
          await showToast({ style: Toast.Style.Animated, title: "Asking the providers…" })
        : undefined;
      try {
        const fresh = forceRefresh
          ? await getModelOptions(true, controller.signal)
          : // SEM `controller.signal`: este loader é COMPARTILHADO por chave com quem mais pedir
            // `modelOptions`. Amarrá-lo ao ciclo de vida desta tela faria o cancelamento daqui
            // rejeitar a Promise de outro consumidor, que perderia a lista em silêncio.
            // A guarda contra `setState` tardio é o `cancelled` logo abaixo.
            await cachedFetch(CacheKeys.modelOptions, CacheTtl.modelOptions, () => getModelOptions(false));
        if (cancelled) return;
        // O resultado do `refresh` também alimenta o cache: quem abrir o seletor do
        // `Perguntar ao Hermes` logo depois vê a lista nova, não a de 10 minutos atrás.
        if (forceRefresh) cacheWrite(CacheKeys.modelOptions, fresh);
        setPayload(fresh);
        setError(undefined);
        await toast?.hide();
      } catch (err) {
        if (cancelled || isAbort(err)) return;
        setError(toHermesError(err, "GET /api/model/options"));
        await toast?.hide();
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setForceRefresh(false);
        }
      }
    })();

    void reloadChoices();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [configured, nonce, forceRefresh, reloadChoices]);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);
  const refreshFromServer = useCallback(() => {
    setForceRefresh(true);
    setNonce((value) => value + 1);
  }, []);

  async function useAsDefault(provider: string, model: string): Promise<void> {
    await writeJson<ModelChoice>(StorageKeys.defaultModel, { provider, model });
    await reloadChoices();
    // Literal da §2.6.
    await showToast({ style: Toast.Style.Success, title: "Default model for the extension updated." });
  }

  async function useNextTurn(provider: string, model: string): Promise<void> {
    await writeJson<ModelChoice>(StorageKeys.nextTurnModel, { provider, model });
    await reloadChoices();
    await showToast({
      style: Toast.Style.Success,
      title: "Applies only to the next question",
      message: "After that Hermes goes back to its usual model.",
    });
  }

  async function clearDefault(): Promise<void> {
    await writeJson(StorageKeys.defaultModel, undefined);
    await writeJson(StorageKeys.nextTurnModel, undefined);
    await reloadChoices();
    await showToast({ style: Toast.Style.Success, title: "Back to the Hermes default." });
  }

  // Guarda de configuração da UX-SPEC §2: sem chave, nenhuma requisição sai daqui.
  if (configured === false) {
    return <NotConfigured commandTitle={COMMAND_TITLE} onRetry={() => setCheck((value) => value + 1)} />;
  }

  const providers = payload?.providers ?? [];
  const hasModels = providers.some((provider) => (provider.models ?? []).length > 0);

  return (
    <List
      navigationTitle={COMMAND_TITLE}
      isLoading={isLoading || configured === undefined}
      isShowingDetail={hasModels}
      searchBarPlaceholder="Search by model or provider"
    >
      {!isLoading && !hasModels && error !== undefined && (
        // §5.3: com a lista vazia, o erro toma a tela — numa `List` isso é a `EmptyView`.
        <List.EmptyView
          icon={statusImage(NO_CONNECTION)}
          /* `NO_CONNECTION` (status.ts) é a fonte única do par ícone+cor de "Sem
             conexão". Repetir o par à mão deixava duas telas fora da paleta do
             Hermes assim que ela mudasse. */
          title={error.userMessage}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} shortcut={SHORTCUTS.refresh} onAction={refresh} />
              <Action
                title="Open Settings"
                icon={Icon.Gear}
                shortcut={SHORTCUTS.preferences}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}

      {!isLoading && !hasModels && error === undefined && (
        <List.EmptyView
          icon={Icon.Wand}
          title="No Model Available"
          description="Hermes is on, but no model provider is set up. Open Hermes Desktop to set one up."
          actions={
            <ActionPanel>
              <Action
                title="Refresh the List"
                icon={Icon.ArrowClockwise}
                shortcut={SHORTCUTS.refresh}
                onAction={refreshFromServer}
              />
              <Action
                title="Open Settings"
                icon={Icon.Gear}
                shortcut={SHORTCUTS.preferences}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}

      {providers.map((provider, index) => {
        const models = provider.models ?? [];
        if (models.length === 0) return null;
        const authenticated = provider.authenticated !== false;
        return (
          <List.Section
            key={provider.slug}
            // §2.6: o esclarecimento de escopo é obrigatório e vai onde o usuário lê antes
            // de escolher qualquer coisa — o título da primeira seção.
            title={index === 0 ? `${provider.name} — ${SCOPE_NOTE}` : provider.name}
            subtitle={authenticated ? undefined : "Needs setup"}
          >
            {models.map((model) => (
              <ModelItem
                key={`${provider.slug}::${model}`}
                provider={provider}
                model={model}
                capability={provider.capabilities?.[model]}
                pricing={provider.pricing?.[model]}
                isServerCurrent={provider.is_current === true && payload?.model === model}
                isExtensionDefault={sameChoice(defaultChoice, provider.slug, model)}
                isNextTurn={sameChoice(nextTurnChoice, provider.slug, model)}
                onUseAsDefault={() => void useAsDefault(provider.slug, model)}
                onUseNextTurn={() => void useNextTurn(provider.slug, model)}
                onClear={() => void clearDefault()}
                onRefresh={refreshFromServer}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

/* ═══════════════════════════════ Item da lista ═══════════════════════════════ */

function ModelItem(props: {
  provider: ProviderOption;
  model: string;
  capability?: ModelCapability;
  pricing?: ModelPricing;
  isServerCurrent: boolean;
  isExtensionDefault: boolean;
  isNextTurn: boolean;
  onUseAsDefault: () => void;
  onUseNextTurn: () => void;
  onClear: () => void;
  onRefresh: () => void;
}): ReactElement {
  const { provider, model, capability, pricing } = props;
  const authenticated = provider.authenticated !== false;
  const fast = capability?.fast === true;
  const reasoning = capability?.reasoning === true;
  const price = priceLine(pricing);

  const accessories: List.Item.Accessory[] = [];
  if (props.isServerCurrent) accessories.push({ tag: { value: "In use", color: Color.Green } });
  if (fast) accessories.push({ tag: "Fast" });
  if (reasoning) accessories.push({ tag: "Reasoning" });
  if (price !== undefined) accessories.push({ text: price });
  // §2.6: provedor sem credencial continua marcado com o cadeado — agora como accessory,
  // porque o ícone da linha passou a identificar a entidade "modelo". A escolha segue
  // liberada: quem configura o provedor é o Hermes Desktop, não esta tela.
  if (!authenticated) accessories.push({ icon: Icon.Lock, tooltip: "Provider with no credential in Hermes" });

  return (
    <List.Item
      title={model}
      keywords={[provider.name, provider.slug]}
      // Todo item da lista tem ícone. Antes, um provedor autenticado vinha sem nenhum, e
      // esta era a única lista da extensão que misturava linhas com e sem ícone — o que
      // desalinha o texto de uma linha para a outra.
      icon={Icon.ComputerChip}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={provider.warning === undefined ? undefined : `> ⚠️ ${provider.warning}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Provedor" text={provider.name} />
              <List.Item.Detail.Metadata.Label title="Model" text={model} />
              <List.Item.Detail.Metadata.Label title="Fast" text={yesNo(fast)} />
              <List.Item.Detail.Metadata.Label title="Reasoning" text={yesNo(reasoning)} />
              <List.Item.Detail.Metadata.Label title="Input Price" text={pricing?.input ?? "—"} />
              <List.Item.Detail.Metadata.Label title="Output Price" text={pricing?.output ?? "—"} />
              <List.Item.Detail.Metadata.Label title="Origin" text={provider.source} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Extension Default"
                text={yesNo(props.isExtensionDefault)}
                icon={props.isExtensionDefault ? Icon.Check : undefined}
              />
              <List.Item.Detail.Metadata.Label
                title="Next Question Only"
                text={yesNo(props.isNextTurn)}
                icon={props.isNextTurn ? Icon.Check : undefined}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {/* Enter. Grava no LocalStorage; NÃO muda nada no Hermes (02 §6.6). */}
            <Action title="Use as the Default Model" icon={Icon.Star} onAction={props.onUseAsDefault} />
            <Action
              title="Use for the Next Question Only"
              icon={Icon.Clock}
              shortcut={SHORTCUTS.nextTurnModel}
              onAction={props.onUseNextTurn}
            />
            {(props.isExtensionDefault || props.isNextTurn) && (
              <Action title="Back to the Hermes Default" icon={Icon.Undo} onAction={props.onClear} />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy the Model Name" content={model} shortcut={SHORTCUTS.copy} />
            <Action
              title="Refresh the List"
              icon={Icon.ArrowClockwise}
              shortcut={SHORTCUTS.refresh}
              onAction={props.onRefresh}
            />
            <Action
              title="Open Settings"
              icon={Icon.Gear}
              shortcut={SHORTCUTS.preferences}
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
