/**
 * As poucas peças que TODA tela usa e que não podem divergir entre comandos.
 *
 * Existe porque quatro telas foram escritas em paralelo e cada uma redigitou a frase da
 * sincronia e a ação `Open Settings`. Um literal da UX-SPEC copiado em cinco arquivos
 * é um literal que vai divergir na primeira revisão de texto: aqui ele tem um dono só.
 */

import {
  Action,
  Icon,
  LaunchType,
  Toast,
  launchCommand,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import type { ReactElement } from "react";
import { SHORTCUTS } from "./shortcuts";

/** UX-SPEC §10.3 — frase canônica da sincronia, usada sem variação. */
export const SYNC_PROMISE = "Your Raycast conversations show up in Hermes Desktop too.";

/** Nome exibido de uma conversa sem título. */
export const NO_TITLE = "Untitled";

/** §5.1 regra 3: `Open Settings` está em toda tela, sempre com o mesmo atalho. */
export function OpenPreferencesAction(): ReactElement {
  return (
    <Action
      title="Open Settings"
      icon={Icon.Gear}
      shortcut={SHORTCUTS.preferences}
      onAction={openExtensionPreferences}
    />
  );
}

/** Abre o comando manifestado de modelos, mantendo a ação disponível em todas as telas. */
export function OpenModelsAction(): ReactElement {
  async function openModels(): Promise<void> {
    try {
      await launchCommand({ name: "models", type: LaunchType.UserInitiated });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Open Models",
        message: 'Search for "Hermes Models" in Raycast.',
      });
    }
  }

  return <Action title="Choose Model" icon={Icon.ComputerChip} onAction={() => void openModels()} />;
}

/**
 * Abre o deep link `hermes://open/<id>` no Hermes Desktop.
 *
 * Existe por causa da §8.4: o esquema `hermes://` só fica registrado se o Hermes Desktop
 * estiver instalado, e a falha não se comporta igual nos dois sistemas — no Windows quem
 * avisa é o próprio sistema, no macOS o `open()` REJEITA. Sem o `catch`, o caminho macOS
 * viraria uma rejeição não tratada dentro de um `onAction`. Aqui ela vira uma frase que
 * diz o que fazer, e `Copiar identificador da conversa` continua ao lado como saída.
 */
export async function openHermesDesktop(url: string): Promise<void> {
  try {
    await open(url);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Open Hermes Desktop",
      message: "Check that Hermes Desktop is installed on this computer.",
    });
  }
}

/*
 * NÃO adicione um `confirmAlert` a `Parar`.
 *
 * A UX-SPEC §6.6 item 6 é explícita: "Sem `confirmAlert`: parar é reversível no sentido em
 * que nada é destruído, e exigir confirmação atrasaria a única saída de emergência do
 * usuário." A regra geral do projeto ("confirmar toda ação irreversível") não se aplica
 * porque a spec declara que `Parar` não é destrutiva: o que já foi produzido continua
 * disponível e o estado terminal fica gravado. As três telas que oferecem `Parar`
 * (`ask`, `run-progress`, `active-runs`) chamam `stopRun()` direto.
 */
