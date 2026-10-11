/**
 * `Ferramentas do Hermes` (UX-SPEC §1.2, fase 2).
 *
 * **Esta é a tela mais perigosa da extensão, e o perigo está no servidor.** O handler de
 * `GET /v1/toolsets` roda no laço de eventos do Hermes e pode disparar uma leitura síncrona
 * de ~8 s ao portal da Nous (`hermes_cli/nous_account.py:595`): enquanto ela acontece, o
 * Hermes inteiro fica parado — inclusive a conversa de outra janela. Daí as três regras,
 * que não são otimização e sim educação com o processo do usuário:
 *
 * 1. **cache primeiro**, 10 minutos (`CacheTtl.toolsets`);
 * 2. **corte em 12 s** (`listToolsets`), porque insistir só prolonga a trava;
 * 3. **nunca em segundo plano** — só quando alguém abriu esta tela ou pediu `Atualizar
 *    lista`. Nada de revalidação automática, nada de pré-carregar em outra tela.
 *
 * Somente leitura, e não por preguiça: **não existe rota para ligar ou desligar um grupo**.
 * A disponibilidade é derivada de `enabled × configured` em `toolsetAvailability()`, porque
 * o servidor também não tem campo "disponível".
 */

import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, type ReactElement } from "react";

import { NotConfigured } from "./components/first-run";
import { OpenPreferencesAction } from "./components/common";
import { statusImage } from "./components/run-progress";
import { SHORTCUTS } from "./components/shortcuts";
import { toHermesError } from "./lib/errors";
import { listToolsets, toolsetAvailability } from "./lib/hermes-api";
import { isConfigured } from "./lib/preferences";
import {
  NO_CONNECTION,
  TOOLSET_AVAILABILITY_APPEARANCE,
  TOOLSET_AVAILABILITY_LABEL,
  type ToolsetAvailability,
} from "./lib/status";
import { CacheKeys, CacheTtl, cacheWrite, cachedFetch } from "./lib/storage";
import type { Toolset } from "./lib/types";

const COMMAND_TITLE = "Hermes Tools";

/** Ordem das seções: primeiro o que dá para usar, por último o que nem existe aqui. */
const SECTION_ORDER: ToolsetAvailability[] = ["disponivel", "precisa_configurar", "desligado", "indisponivel"];

/** O que cada estado significa em uma frase, no subtítulo da seção. */
const SECTION_NOTE: Record<ToolsetAvailability, string> = {
  disponivel: "Hermes can use it right now",
  precisa_configurar: "a credential or a connected account is missing",
  desligado: "it has a credential, but is not turned on for Raycast",
  indisponivel: "it is neither turned on nor set up",
};

function detailMarkdown(toolset: Toolset): string {
  const availability = toolsetAvailability(toolset);
  const blocks = [
    // O `label` vem do servidor com emoji. Ele é CONTEÚDO — o nome pelo qual o grupo aparece
    // no Hermes Desktop —, não copy nossa, e por isso não cai na regra de §11.
    `# ${toolset.label}`,
    toolset.description.trim() === "" ? "_This group has no description._" : toolset.description,
    `**${TOOLSET_AVAILABILITY_LABEL[availability]}** — ${SECTION_NOTE[availability]}.`,
  ];

  if (toolset.tools.length > 0) {
    blocks.push(
      `## Tools in this group (${toolset.tools.length})`,
      toolset.tools.map((tool) => `- \`${tool}\``).join("\n"),
    );
  }

  return blocks.join("\n\n");
}

export default function Command(): ReactElement {
  const [nonce, setNonce] = useState(0);
  const { data: configured, isLoading: checking, revalidate: recheck } = usePromise(isConfigured);

  const {
    data: toolsets,
    isLoading,
    error,
  } = usePromise(
    async (ready: boolean | undefined, force: number) => {
      if (ready !== true) return undefined;
      // Só o `Atualizar lista` fura o cache — e mesmo ele é um pedido explícito de alguém
      // olhando a tela. Nunca há chamada automática a este endpoint.
      const fresh =
        force > 0 ? await listToolsets() : await cachedFetch(CacheKeys.toolsets, CacheTtl.toolsets, listToolsets);
      if (force > 0) cacheWrite(CacheKeys.toolsets, fresh);
      return fresh.data;
    },
    [configured, nonce],
  );

  if (configured === false) return <NotConfigured commandTitle={COMMAND_TITLE} onRetry={recheck} />;

  const refreshAction = (
    <Action
      title="Refresh the List"
      icon={Icon.ArrowClockwise}
      shortcut={SHORTCUTS.refresh}
      onAction={() => setNonce((value) => value + 1)}
    />
  );

  const busy = checking || isLoading;
  const all = toolsets ?? [];
  const grouped = SECTION_ORDER.map(
    (availability) => [availability, all.filter((item) => toolsetAvailability(item) === availability)] as const,
  ).filter(([, items]) => items.length > 0);

  return (
    <List
      navigationTitle={COMMAND_TITLE}
      isLoading={busy}
      isShowingDetail={all.length > 0}
      searchBarPlaceholder="Search tool groups"
    >
      {error !== undefined && all.length === 0 ? (
        <List.EmptyView
          icon={statusImage(NO_CONNECTION)}
          title={toHermesError(error, "GET /v1/toolsets").userMessage}
          description="This query is heavy for Hermes and has a 12-second limit. If it is busy, try again in a moment."
          actions={
            <ActionPanel>
              {refreshAction}
              <OpenPreferencesAction />
            </ActionPanel>
          }
        />
      ) : null}

      {!busy && error === undefined && all.length === 0 ? (
        <List.EmptyView
          icon={{ source: "cmd-toolsets.png" }}
          title="No Tool Group"
          description="This Hermes does not expose any tool group to Raycast."
          actions={
            <ActionPanel>
              {refreshAction}
              <OpenPreferencesAction />
            </ActionPanel>
          }
        />
      ) : null}

      {grouped.map(([availability, items]) => (
        <List.Section
          key={availability}
          title={TOOLSET_AVAILABILITY_LABEL[availability]}
          subtitle={`${items.length} · ${SECTION_NOTE[availability]}`}
        >
          {items.map((toolset) => (
            <List.Item
              key={toolset.name}
              icon={statusImage(TOOLSET_AVAILABILITY_APPEARANCE[availability])}
              title={toolset.label}
              keywords={[toolset.name, toolset.description, ...toolset.tools]}
              accessories={[{ text: `${toolset.tools.length}`, tooltip: "How many tools this group brings" }]}
              detail={<List.Item.Detail markdown={detailMarkdown(toolset)} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy the Group Name"
                      content={toolset.name}
                      shortcut={SHORTCUTS.copy}
                    />
                    {refreshAction}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Configure in Hermes Desktop"
                      icon={Icon.Gear}
                      shortcut={SHORTCUTS.preferences}
                      onAction={() =>
                        void showToast({
                          style: Toast.Style.Animated,
                          title: "Set up tools in Hermes Desktop",
                        })
                      }
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
