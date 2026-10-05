/**
 * `Skills do Hermes` (UX-SPEC §1.2, fase 2).
 *
 * Somente leitura, e é importante que fique claro por quê: **não existe rota para ligar ou
 * desligar uma skill** no API Server. O que `GET /v1/skills` devolve já são só as
 * habilitadas — não há campo `enabled`, não há paginação e não há filtro. Uma ação
 * "desativar" aqui seria uma promessa que o servidor não cumpre.
 *
 * O termo `skill` fica em inglês de propósito (glossário §10.2): é o nome que o usuário
 * já vê no Hermes Desktop, e traduzir criaria dois nomes para a mesma coisa.
 *
 * `category` pode vir `null` — 140 skills neste servidor, várias sem categoria. Por isso a
 * seção de fallback existe e não é caso de borda raro.
 */

import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, type ReactElement } from "react";

import { NotConfigured } from "./components/first-run";
import { OpenPreferencesAction } from "./components/common";
import { statusImage } from "./components/run-progress";
import { SHORTCUTS } from "./components/shortcuts";
import { toHermesError } from "./lib/errors";
import { listSkills } from "./lib/hermes-api";
import { isConfigured } from "./lib/preferences";
import { NO_CONNECTION } from "./lib/status";
import { CacheKeys, CacheTtl, cacheWrite, cachedFetch } from "./lib/storage";
import type { Skill } from "./lib/types";

const COMMAND_TITLE = "Hermes Skills";
/** Seção de quem veio sem `category`. */
const NO_CATEGORY = "No category";

/** Agrupa por categoria, com as categorias em ordem alfabética e a genérica por último. */
function byCategory(skills: readonly Skill[]): [string, Skill[]][] {
  const groups = new Map<string, Skill[]>();
  for (const skill of skills) {
    const key =
      skill.category === null || skill.category === undefined || skill.category === "" ? NO_CATEGORY : skill.category;
    const bucket = groups.get(key);
    if (bucket === undefined) groups.set(key, [skill]);
    else bucket.push(skill);
  }

  return [...groups.entries()].sort(([a], [b]) => {
    if (a === NO_CATEGORY) return 1;
    if (b === NO_CATEGORY) return -1;
    return a.localeCompare(b, "en");
  });
}

function detailMarkdown(skill: Skill): string {
  return [
    `# ${skill.name}`,
    skill.description.trim() === "" ? "_This skill has no description._" : skill.description,
  ].join("\n\n");
}

export default function Command(): ReactElement {
  const [nonce, setNonce] = useState(0);
  const { data: configured, isLoading: checking, revalidate: recheck } = usePromise(isConfigured);

  const {
    data: skills,
    isLoading,
    error,
  } = usePromise(
    async (ready: boolean | undefined, force: number) => {
      if (ready !== true) return undefined;
      // `force > 0` é o `Atualizar lista`: aí a lista vem do servidor e realimenta o cache.
      const fresh = force > 0 ? await listSkills() : await cachedFetch(CacheKeys.skills, CacheTtl.skills, listSkills);
      if (force > 0) cacheWrite(CacheKeys.skills, fresh);
      return fresh.data;
    },
    [configured, nonce],
  );

  if (configured === false) return <NotConfigured commandTitle={COMMAND_TITLE} onRetry={recheck} />;

  const groups = byCategory(skills ?? []);
  const busy = checking || isLoading;

  return (
    <List
      navigationTitle={COMMAND_TITLE}
      isLoading={busy}
      isShowingDetail={(skills?.length ?? 0) > 0}
      searchBarPlaceholder="Search skills by name or description"
    >
      {error !== undefined && (skills?.length ?? 0) === 0 ? (
        <List.EmptyView
          icon={statusImage(NO_CONNECTION)}
          title={toHermesError(error, "GET /v1/skills").userMessage}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                shortcut={SHORTCUTS.refresh}
                onAction={() => setNonce((value) => value + 1)}
              />
              <OpenPreferencesAction />
            </ActionPanel>
          }
        />
      ) : null}

      {!busy && error === undefined && (skills?.length ?? 0) === 0 ? (
        <List.EmptyView
          icon={{ source: "cmd-skills.png" }}
          title="No Skill Enabled"
          description="This Hermes has no skill turned on. They are set up in Hermes Desktop."
          actions={
            <ActionPanel>
              <Action
                title="Refresh the List"
                icon={Icon.ArrowClockwise}
                shortcut={SHORTCUTS.refresh}
                onAction={() => setNonce((value) => value + 1)}
              />
              <OpenPreferencesAction />
            </ActionPanel>
          }
        />
      ) : null}

      {groups.map(([category, items]) => (
        <List.Section key={category} title={category} subtitle={`${items.length}`}>
          {items.map((skill) => (
            <List.Item
              key={skill.name}
              icon={{ source: "cmd-skills.png" }}
              title={skill.name}
              keywords={[skill.description]}
              detail={<List.Item.Detail markdown={detailMarkdown(skill)} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy the Skill Name"
                      content={skill.name}
                      shortcut={SHORTCUTS.copy}
                    />
                    <Action
                      title="Refresh the List"
                      icon={Icon.ArrowClockwise}
                      shortcut={SHORTCUTS.refresh}
                      onAction={() => setNonce((value) => value + 1)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Configure in Hermes Desktop"
                      icon={Icon.Gear}
                      shortcut={SHORTCUTS.preferences}
                      onAction={() =>
                        void showToast({ style: Toast.Style.Animated, title: "Set up skills in Hermes Desktop" })
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
