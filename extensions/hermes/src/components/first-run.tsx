/**
 * A superfície de PRIMEIRO USO (UX-SPEC §3), em um lugar só.
 *
 * Quatro telas empilháveis:
 *   FirstRunScreen    §3.4 — renderizada por QUALQUER comando quando não há chave.
 *                            `NotConfigured` é o mesmo componente com o nome que os
 *                            comandos usam na guarda de configuração.
 *   AutoDetectScreen  §3.5 — a ação explícita `Detectar configuração automaticamente`.
 *   ManualSetupScreen §3.7 — o caminho sem terminal, com o gerenciador de arquivos e o
 *                            editor de texto DO SISTEMA em que a extensão está rodando
 *                            (Explorador + Bloco de Notas, ou Finder + TextEdit).
 *   WhyKeyScreen      §3.9 — `O que é isso?`.
 *
 * REGRAS DE SEGREDO QUE GOVERNAM ESTE ARQUIVO (UX-SPEC §3.1, §3.6 e §5.1 regra 5):
 * - a `API_SERVER_KEY` NUNCA entra em estado de React, em markdown, em Toast, em
 *   metadata, em log ou no clipboard — nem o valor, nem um prefixo, nem o tamanho;
 * - a única função que chega perto dela é `detectConfiguration()`, onde a chave vive
 *   como `const` local por duas linhas: vai para `saveDetectedApiKey()` (LocalStorage
 *   criptografado) e para `sanitizeTechnical()` como segredo A SER APAGADO;
 * - todo detalhe técnico exibido ou copiado passa por `sanitizeTechnical()`, sempre,
 *   inclusive quando não há chave carregada;
 * - a leitura de arquivo do Hermes só acontece sob ação do usuário. Nada aqui roda em
 *   background, em `interval` ou na inicialização de outro comando.
 *
 * `check-connection.tsx` (o diagnóstico da §2.7) importa daqui as telas e os auxiliares
 * de texto — antes eram duas implementações do mesmo §3, com literais já divergentes.
 */

import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Action, ActionPanel, Alert, Detail, Icon, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { isHermesAgent, readApiKeyFromEnvFile, resolveBaseUrl, resolveHermesHome } from "../lib/discovery";
import {
  HermesAuthError,
  HermesConnectionError,
  HermesError,
  HermesWrongServerError,
  sanitizeTechnical,
  toHermesError,
} from "../lib/errors";
import { health, listModels } from "../lib/hermes-api";
import { type PlatformCopy, platformCopy } from "../lib/platform";
import { resolveApiKey } from "../lib/preferences";
import { forgetDetectedApiKey, saveDetectedApiKey } from "../lib/storage";
import { OpenPreferencesAction } from "./common";
import { SHORTCUTS } from "./shortcuts";

/* ───────────────────────── Textos literais da UX-SPEC ─────────────────────── */

export const E1_TEXT =
  "Could not connect to Hermes. Check that the Hermes API Server is on, and that the address and the key are right.";
export const E2_TEXT = "Hermes did not accept the access key. It may have changed since the last time.";
export const E3_TEXT =
  "I found a program at that address, but it is not the Hermes API Server. Check the address in the settings.";
export const E26_TEXT = "I could not read the Hermes configuration file. You can set it up by hand.";

/* ──────────────────────────── Utilidades pequenas ─────────────────────────── */

export function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

/** `2026-08-19 14:32:07` — formato literal do bloco de detalhes técnicos (§5.1). */
export function timestamp(): string {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  );
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function pathReadable(target: string): Promise<boolean> {
  try {
    await access(target, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * §5.2 — a frase que o usuário lê vem do catálogo da UX-SPEC, escolhida pelo TIPO do
 * erro (nunca pela mensagem do servidor, que é redigida e muda entre versões).
 */
export function errorCopy(error: HermesError): { text: string; uxId?: string } {
  if (error instanceof HermesAuthError || error.uxId === "E2") return { text: E2_TEXT, uxId: "E2" };
  if (error instanceof HermesWrongServerError) return { text: E3_TEXT, uxId: "E3" };
  if (error instanceof HermesConnectionError || error.uxId === "E1") return { text: E1_TEXT, uxId: "E1" };
  return { text: error.userMessage, uxId: error.uxId };
}

export function technicalBlock(text: string): string {
  return ["### Technical details", "", "```", text, "```"].join("\n");
}

/* ────────────────────────── Ações compartilhadas ──────────────────────────── */

export function AutoDetectAction({ title, onDone }: { title?: string; onDone?: () => void }) {
  const { push } = useNavigation();
  return (
    <Action
      title={title ?? "Detect the Setup Automatically"}
      icon={Icon.MagnifyingGlass}
      shortcut={SHORTCUTS.autoDetect}
      onAction={() => push(<AutoDetectScreen onDone={onDone} />)}
    />
  );
}

export function ManualSetupAction() {
  const { push } = useNavigation();
  // Sem atalho de propósito (§3.4): `Ctrl+Shift+A` já significa `Open Settings`
  // em toda a extensão e um mesmo atalho não pode ter dois significados.
  return <Action title="Manual Setup" icon={Icon.Book} onAction={() => push(<ManualSetupScreen />)} />;
}

export function OpenHermesFolderAction({ hermesHome }: { hermesHome: string }) {
  return (
    <Action.Open
      title="Open the Hermes Folder"
      target={hermesHome}
      icon={Icon.Folder}
      shortcut={SHORTCUTS.hermesFolder}
    />
  );
}

export function CopyTechnicalAction({ technical }: { technical: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy Technical Details"
      // Já sanitizado na origem: nenhum Bearer, nenhuma chave, nem por acidente.
      content={technical === "" ? "No technical details yet: the check is still going." : technical}
      shortcut={SHORTCUTS.copyTechnical}
      icon={Icon.Clipboard}
    />
  );
}

export function ForgetKeyAction({ onDone }: { onDone?: () => void }) {
  return (
    <Action
      title="Forget the Detected Key"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={SHORTCUTS.remove}
      onAction={async () => {
        const confirmed = await confirmAlert({
          title: "Forget the detected key?",
          message: "Raycast will delete the key stored on this computer. You can detect it again whenever you want.",
          primaryAction: { title: "Forget the Key", style: Alert.ActionStyle.Destructive },
          dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
          rememberUserChoice: false,
        });
        if (!confirmed) return;
        await forgetDetectedApiKey();
        await showToast({ style: Toast.Style.Success, title: "Key removed from this computer." });
        onDone?.();
      }}
    />
  );
}

export function BackAction() {
  const { pop } = useNavigation();
  // `Esc` já volta e é reservado pelo Raycast (§9.1): a ação existe para não ficar
  // órfã do painel, sem roubar o atalho.
  return <Action title="Go Back" icon={Icon.ArrowLeft} onAction={pop} />;
}

/* ─────────────────── Tela 2: primeiro uso, sem chave (§3.4) ───────────────── */

const FIRST_RUN_BODY = [
  "To use this extension, Raycast needs an access key from the Hermes installed on this computer. This is done only once.",
  "",
  '**The easiest way:** press Enter on "Detect the Setup Automatically". Raycast looks for the key in your Hermes, tests the connection and stores the key safely. The key is never shown.',
  "",
  'If you would rather do it by hand, choose "Manual Setup" in the action panel.',
].join("\n");

/**
 * O que a tela de boas-vindas já sabe ANTES de o usuário apertar Enter (§3.4).
 *
 * Só presença: `resolveBaseUrl()` lê `config.yaml`/`gateway.pid` para achar a porta e
 * chama `/health` — exatamente o que TODO comando já faz em toda requisição. O que
 * continua trancado atrás da ação explícita da §3.1 é a linha `API_SERVER_KEY=` do
 * `.env`: nenhum segredo é lido aqui, nem por acidente.
 *
 * Existe porque sem isto a tela pedia um Enter às cegas: com o Hermes desligado o
 * usuário só descobria depois da detecção falhar — tendo a chave sido encontrada e
 * descartada no caminho, já que a §3.6 só grava depois de validar.
 */
export type HermesPresence =
  | { kind: "procurando" }
  | { kind: "encontrado"; host: string; version: string }
  | { kind: "outroServidor" }
  | { kind: "ausente" };

export async function probeHermesPresence(): Promise<HermesPresence> {
  try {
    const endpoint = await resolveBaseUrl();
    return { kind: "encontrado", host: hostOf(endpoint.baseUrl), version: endpoint.version };
  } catch (err) {
    const error = toHermesError(err, "looking for Hermes");
    return error instanceof HermesWrongServerError ? { kind: "outroServidor" } : { kind: "ausente" };
  }
}

/** A primeira linha muda com o que a sondagem achou; o convite ao Enter é sempre o mesmo. */
export function firstRunMarkdown(presence: HermesPresence): string {
  return ["# Connect Raycast to your Hermes", "", presenceLine(presence), "", FIRST_RUN_BODY].join("\n");
}

function presenceLine(presence: HermesPresence): string {
  switch (presence.kind) {
    case "procurando":
      return "_Looking for Hermes on this computer…_";
    case "encontrado":
      return `**Found Hermes ${presence.version} here**, at ${presence.host}. All that is missing is the access key.`;
    case "outroServidor":
      return '**Something is answering at that address, but it is not Hermes.** Check the address in "Open Settings" before going on.';
    case "ausente":
      return (
        "**Hermes did not answer on this computer.** Turn Hermes on before going on: with it down the " +
        'connection cannot be tested. If your Hermes uses another address, change it in "Open Settings".'
      );
  }
}

/**
 * §3.4 — renderizada por QUALQUER comando quando não há chave (guarda de §2.2).
 * `navigationTitle` é o título do comando que o usuário abriu.
 */
export function FirstRunScreen({ navigationTitle, onDone }: { navigationTitle: string; onDone?: () => void }) {
  const { push } = useNavigation();
  const [presence, setPresence] = useState<HermesPresence>({ kind: "procurando" });

  useEffect(() => {
    let alive = true;
    void probeHermesPresence().then((result) => {
      if (alive) setPresence(result);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Detail
      isLoading={presence.kind === "procurando"}
      navigationTitle={navigationTitle}
      markdown={firstRunMarkdown(presence)}
      actions={
        <ActionPanel>
          <AutoDetectAction onDone={onDone} />
          <ManualSetupAction />
          <Action
            title="What Is This?"
            icon={Icon.QuestionMarkCircle}
            shortcut={SHORTCUTS.showTechnical}
            onAction={() => push(<WhyKeyScreen />)}
          />
          <OpenPreferencesAction />
        </ActionPanel>
      }
    />
  );
}

export interface NotConfiguredProps {
  /** Título do comando que o usuário abriu — vira o `navigationTitle` (§3.4). */
  commandTitle: string;
  /** Reavalia a chave quando o usuário volta da detecção ou das configurações. */
  onRetry?: () => void;
}

/**
 * O mesmo `FirstRunScreen`, com o nome e a forma de props que os comandos usam na guarda
 * de configuração. Existe para que "sem chave" seja UMA tela na extensão inteira: antes
 * havia duas, e os literais da §3.4/§3.7 já tinham divergido entre elas.
 */
export function NotConfigured({ commandTitle, onRetry }: NotConfiguredProps): ReactElement {
  return <FirstRunScreen navigationTitle={commandTitle} onDone={onRetry} />;
}

/* ───────────────── Tela 3: detecção automática (§3.1, §3.5, §3.6) ─────────── */

type DetectionResult =
  | {
      kind: "sucesso";
      hermesHome: string;
      baseUrl: string;
      version: string;
      technical: string;
      /** §3.3: existe uma preferência preenchida, e é ELA que os comandos vão usar. */
      preferenceWins: boolean;
    }
  | { kind: "semArquivo"; hermesHome: string; folderExists: boolean; technical: string }
  | { kind: "semChave"; hermesHome: string; envPath: string; technical: string }
  | { kind: "semLeitura"; hermesHome: string; envPath: string; technical: string }
  | { kind: "recusada"; hermesHome: string; technical: string }
  | { kind: "offline"; hermesHome: string; text: string; technical: string };

/**
 * A ÚNICA função da extensão autorizada a tocar em arquivos do Hermes procurando um
 * segredo, e só a partir da ação explícita do usuário (§3.1). Limites, literalmente:
 *
 *   PERMITIDO: `<HERMES_HOME>\.env` só na linha `API_SERVER_KEY=` (por
 *   `readApiKeyFromEnvFile()`, que não devolve nenhuma outra variável);
 *   `<HERMES_HOME>\config.yaml` só para a porta e `<HERMES_HOME>\gateway.pid` só
 *   para saber se o gateway está vivo (os dois por `resolveBaseUrl()`).
 *
 *   PROIBIDO: qualquer outra chave do `.env`; `auth.json`, `state.db`, `desktop.json`,
 *   `connections.json`; escrever qualquer arquivo do Hermes; rodar em background;
 *   guardar a chave fora do LocalStorage; exibir a chave, seu prefixo ou seu tamanho;
 *   copiar a chave para o clipboard; repetir sozinha depois de falhar.
 */
async function detectConfiguration(): Promise<DetectionResult> {
  const hermesHome = await resolveHermesHome();
  const envPath = path.join(hermesHome, ".env");
  const folderExists = await pathExists(hermesHome);
  const envExists = folderExists && (await pathExists(envPath));

  const note = (extra: string): string =>
    sanitizeTechnical([`Hermes folder: ${hermesHome}`, `Moment: ${timestamp()}`, extra].join("\n"));

  if (!folderExists || !envExists) {
    return {
      kind: "semArquivo",
      hermesHome,
      folderExists,
      technical: note(`Folder exists: ${folderExists ? "yes" : "no"}. File .env exists: ${envExists ? "yes" : "no"}.`),
    };
  }

  // E26: o arquivo está lá mas não abre (permissão). Não é "chave ausente".
  if (!(await pathReadable(envPath))) {
    return {
      kind: "semLeitura",
      hermesHome,
      envPath,
      technical: note(`The file ${envPath} exists, but could not be opened for reading.`),
    };
  }

  const key = await readApiKeyFromEnvFile(hermesHome);
  if (key === undefined) {
    return {
      kind: "semChave",
      hermesHome,
      envPath,
      technical: note("The .env file was read, but it has no API_SERVER_KEY= line with a value."),
    };
  }

  let baseUrl: string | undefined;
  try {
    const endpoint = await resolveBaseUrl({ force: true });
    baseUrl = endpoint.baseUrl;
    const info = await health();
    if (!isHermesAgent(info)) {
      throw new HermesWrongServerError({
        userMessage: E3_TEXT,
        technical: `GET ${endpoint.baseUrl}/health answered platform="${info.platform}", status="${info.status}".`,
        recovery: "open_preferences",
      });
    }
    // A chave vai EXPLÍCITA: sem isso `listModels()` usaria a chave resolvida pela §3.3,
    // em que a PREFERÊNCIA vence — a tela validaria uma credencial e diria "encontrada e
    // guardada em segurança" sobre outra, e um 401 da preferência velha apagaria a chave
    // detectada, que era justamente a correta.
    await listModels(undefined, key);

    // Só depois de provada. Único destino permitido: o LocalStorage criptografado.
    await saveDetectedApiKey(key);
    // §3.3: a preferência continua vencendo. Se houver uma, é ela que os comandos usam, e
    // a tela precisa dizer isso em vez de prometer que a detecção passou a valer.
    const { source } = await resolveApiKey();

    return {
      kind: "sucesso",
      hermesHome,
      baseUrl: endpoint.baseUrl,
      version: info.version,
      preferenceWins: source === "preference",
      // `[key]` aqui é a segunda passada de redação: garante que nem um eco do valor
      // sobreviva no texto copiável.
      technical: sanitizeTechnical(
        [`Hermes folder: ${hermesHome}`, `Address: ${endpoint.baseUrl}`, `Moment: ${timestamp()}`].join("\n"),
        [key],
      ),
    };
  } catch (err) {
    const error = toHermesError(err, "automatic detection");
    const technical = sanitizeTechnical(
      [
        `Hermes folder: ${hermesHome}`,
        `Address: ${baseUrl ?? "not resolved"}`,
        `Answer: ${error.httpStatus ?? "-"}`,
        `Code: ${error.code ?? "-"}`,
        `Moment: ${timestamp()}`,
        "",
        error.technical,
      ].join("\n"),
      [key],
    );
    // §3.3: a chave recusada não fica guardada — e como só gravamos DEPOIS de validar,
    // não há nada a desfazer aqui: a chave anterior (se existia) segue intacta.
    if (error instanceof HermesAuthError) return { kind: "recusada", hermesHome, technical };
    return { kind: "offline", hermesHome, text: errorCopy(error).text, technical };
  }
}

function detectionMarkdown(result: DetectionResult): string {
  switch (result.kind) {
    case "sucesso":
      return [
        "# All set, you are connected",
        "",
        "I found the Hermes on this computer and the connection worked.",
        "",
        `- Address: ${hostOf(result.baseUrl)}`,
        `- Hermes version: ${result.version}`,
        "- Access key: found, tested and stored safely",
        "",
        "The key is kept in the protected Raycast storage and is never shown on any screen.",
        ...(result.preferenceWins
          ? [
              "",
              // §3.3: dizer a verdade sobre QUAL chave vai ser usada. Sem isto o usuário
              // veria "conectado" e continuaria tomando erro, porque a preferência antiga
              // é que segue valendo.
              'Careful: there is a key filled in under "Hermes Key" in the settings, and that is the one the commands will use. Clear the field if you want the detected key to win.',
            ]
          : []),
        "",
        "Your Raycast conversations will show up in Hermes Desktop too.",
      ].join("\n");

    case "semArquivo":
      return [
        "# I could not find Hermes on this computer",
        "",
        "I looked in:",
        "",
        result.hermesHome,
        "",
        "and did not find the Hermes configuration file.",
        "",
        "This usually happens when Hermes is installed in another folder, or has not been installed yet.",
      ].join("\n");

    case "semChave":
      return [
        "# I found Hermes, but not the key",
        "",
        "The configuration file exists, but it has no access key line.",
        "",
        `File: ${result.envPath}`,
        "Line looked for: one that starts with API_SERVER_KEY=",
        "",
        "Open Hermes Desktop once and let Hermes start. It creates that key on its own the first time.",
      ].join("\n");

    case "semLeitura":
      return ["# I could not open the Hermes file", "", E26_TEXT, "", `File: ${result.envPath}`].join("\n");

    case "recusada":
      return [
        "# The key I found was not accepted",
        "",
        "I found a key in your Hermes, but Hermes rejected it.",
        "",
        "That usually means Hermes is running with a different setup from the one saved on disk. Close and open Hermes Desktop and try again.",
      ].join("\n");

    case "offline":
      return ["# Could not connect", "", result.text].join("\n");
  }
}

/**
 * §3.5 — o resultado da detecção. A tela sempre diz o que foi lido e de onde, e nunca
 * mostra a chave. `Esquecer a chave detectada` desfaz tudo (§3.2, item 4).
 */
export function AutoDetectScreen({ onDone }: { onDone?: () => void }) {
  const { pop } = useNavigation();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<DetectionResult | undefined>(undefined);
  const [showTechnical, setShowTechnical] = useState(false);

  const again = useCallback(() => {
    setResult(undefined);
    setShowTechnical(false);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    let toast: Toast | undefined;

    void (async () => {
      // §3.2: a ação nunca é silenciosa — o Toast animado é obrigatório.
      toast = await showToast({ style: Toast.Style.Animated, title: "Looking for the Hermes setup…" });
      const outcome = await detectConfiguration().catch((err: unknown) => {
        const error = toHermesError(err, "automatic detection");
        const failure: DetectionResult = {
          kind: "offline",
          hermesHome: "",
          text: errorCopy(error).text,
          technical: sanitizeTechnical(error.technical),
        };
        return failure;
      });
      if (!alive) {
        await toast.hide();
        return;
      }
      setResult(outcome);
      if (outcome.kind === "sucesso") {
        toast.style = Toast.Style.Success;
        toast.title = "Connected to Hermes";
      } else {
        await toast.hide();
      }
    })();

    return () => {
      alive = false;
      void toast?.hide();
    };
  }, [attempt]);

  if (result === undefined) {
    return (
      <Detail
        isLoading
        navigationTitle="Detect the Setup Automatically"
        markdown={["# Detect the setup automatically", "", "_Looking for the Hermes setup…_"].join("\n")}
        actions={
          <ActionPanel>
            <ManualSetupAction />
            <OpenPreferencesAction />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = showTechnical
    ? [detectionMarkdown(result), "", technicalBlock(result.technical)].join("\n")
    : detectionMarkdown(result);

  const showFolder =
    result.hermesHome !== "" && (result.kind === "semChave" || (result.kind === "semArquivo" && result.folderExists));

  // A ordem muda com o desfecho, mas cada ação aparece UMA vez: `Tentar de novo` é a
  // primária quando repetir resolve (§3.5 B, C, D) e `Configurar manualmente` é a
  // primária quando repetir não vai resolver (§3.5 A e E26).
  const retryAction = (
    <Action key="tentar" title="Try Again" icon={Icon.ArrowClockwise} shortcut={SHORTCUTS.refresh} onAction={again} />
  );
  const manualAction = <ManualSetupAction key="manual" />;
  const mainActions: ReactElement[] = [];

  if (result.kind === "sucesso") {
    mainActions.push(
      <Action
        key="continuar"
        title="Continue"
        icon={Icon.CheckCircle}
        onAction={() => {
          pop();
          onDone?.();
        }}
      />,
      <Action
        key="testar"
        title="Test Again"
        icon={Icon.ArrowClockwise}
        shortcut={SHORTCUTS.testConnection}
        onAction={again}
      />,
    );
  } else if (result.kind === "semArquivo" || result.kind === "semLeitura") {
    mainActions.push(manualAction, retryAction);
  } else {
    mainActions.push(retryAction, manualAction);
  }

  if (showFolder) mainActions.push(<OpenHermesFolderAction key="pasta" hermesHome={result.hermesHome} />);
  if (result.kind === "semChave") {
    mainActions.push(
      <Action.CopyToClipboard
        key="caminho"
        title="Copy the File Path"
        content={result.envPath}
        shortcut={SHORTCUTS.copyPath}
        icon={Icon.Clipboard}
      />,
    );
  }
  mainActions.push(<OpenPreferencesAction key="preferencias" />);

  return (
    <Detail
      navigationTitle="Detect the Setup Automatically"
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>{mainActions}</ActionPanel.Section>
          <ActionPanel.Section title="Technical Details">
            <Action
              title={showTechnical ? "Hide Technical Details" : "Show Technical Details"}
              icon={showTechnical ? Icon.EyeDisabled : Icon.Eye}
              shortcut={SHORTCUTS.showTechnical}
              onAction={() => setShowTechnical((value) => !value)}
            />
            <CopyTechnicalAction technical={result.technical} />
          </ActionPanel.Section>
          {result.kind === "sucesso" ? (
            <ActionPanel.Section>
              <ForgetKeyAction onDone={again} />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}

/* ────────────────── Tela 4: caminho manual, sem terminal (§3.7) ───────────── */

export function manualMarkdown(hermesHome: string, copy: PlatformCopy = platformCopy()): string {
  return [
    "# Manual setup",
    "",
    "You are going to copy one line out of a text file. No terminal needed.",
    "",
    "**1. Open the Hermes folder**",
    "",
    `Use the "Open the Hermes Folder" action below. ${copy.fileManager} opens at:`,
    "",
    hermesHome,
    "",
    "**2. Open the file called `.env`**",
    "",
    `Right-click the \`.env\` file and choose "Open with" → "${copy.plainTextEditor}".`,
    copy.showHiddenFilesHint,
    "",
    "**3. Look for the line that starts with `API_SERVER_KEY=`**",
    "",
    `In ${copy.plainTextEditor}, press ${copy.findKeys}, type \`API_SERVER_KEY\` and press Enter.`,
    "The line looks like this:",
    "",
    "API_SERVER_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "",
    "**4. Copy only what comes after the equals sign**",
    "",
    `Select the text after the \`=\`, copy it with ${copy.copyKeys} and close ${copy.plainTextEditor} without saving.`,
    "",
    "**5. Paste it into the extension settings**",
    "",
    'Use the "Open Settings" action and paste it into the "Hermes Key" field.',
    "",
    "Treat that key like a password: anyone who has it can talk to your Hermes.",
  ].join("\n");
}

/**
 * §3.7 — escrito para quem não vai abrir um terminal. `Abrir a pasta do Hermes` abre a
 * PASTA, nunca o arquivo: colocar o segredo na tela é escolha do usuário no gerenciador
 * de arquivos, não da extensão.
 *
 * O passo a passo nomeia os programas do sistema em que a extensão está rodando
 * (`platformCopy()`), então um usuário de Mac nunca lê "Bloco de Notas".
 */
export function ManualSetupScreen() {
  const [hermesHome, setHermesHome] = useState<string | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void resolveHermesHome().then((home) => {
      if (alive) setHermesHome(home);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Detail
      isLoading={hermesHome === undefined}
      navigationTitle="Manual Setup"
      markdown={manualMarkdown(hermesHome ?? "…")}
      actions={
        <ActionPanel>
          {hermesHome === undefined ? null : <OpenHermesFolderAction hermesHome={hermesHome} />}
          <OpenPreferencesAction />
          {hermesHome === undefined ? null : (
            <Action.CopyToClipboard
              title="Copy the File Path"
              // O CAMINHO, nunca o conteúdo do arquivo (§3.7).
              content={path.join(hermesHome, ".env")}
              shortcut={SHORTCUTS.copyPath}
              icon={Icon.Clipboard}
            />
          )}
          <AutoDetectAction title="Try Automatic Detection" />
          <BackAction />
        </ActionPanel>
      }
    />
  );
}

/* ─────────────────────── Tela 5: `O que é isso?` (§3.9) ───────────────────── */

const WHY_KEY_MARKDOWN = [
  "# Why a key?",
  "",
  "The Hermes running on your computer only takes requests from programs that present a key. That stops any site or app open on your machine from talking to your agent without you knowing.",
  "",
  'The key stays only on your computer. This extension never sends it to the internet, it never shows up on screens, error messages or logs, and you can remove it at any time with "Forget the Detected Key".',
].join("\n");

export function WhyKeyScreen() {
  return (
    <Detail
      navigationTitle="Why a Key?"
      markdown={WHY_KEY_MARKDOWN}
      actions={
        <ActionPanel>
          <AutoDetectAction />
          <ManualSetupAction />
          <OpenPreferencesAction />
          <BackAction />
        </ActionPanel>
      }
    />
  );
}
