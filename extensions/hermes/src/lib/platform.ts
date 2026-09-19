/**
 * O pouco que muda entre Windows e macOS, em um lugar só.
 *
 * A extensão é uma base de código só para os dois sistemas (`"platforms": ["macOS",
 * "Windows"]` no manifest). O que de fato difere é pequeno e cabe aqui:
 *
 *   - **onde o Hermes guarda os arquivos** — `%LOCALAPPDATA%\hermes` no Windows,
 *     `~/.hermes` no macOS. Isso vive em `discovery.ts` (`defaultHermesHome`), porque
 *     é descoberta, não texto de tela;
 *   - **como o usuário chama as coisas** — "File Explorer"/"Notepad"
 *     contra "Finder"/"TextEdit", e `Ctrl` contra `Cmd`. Isso vive aqui;
 *   - **as teclas dos atalhos** — em `components/shortcuts.ts`, na forma que a própria
 *     API do Raycast oferece (`{ Windows, macOS }`), não por `if`.
 *
 * REGRA: nada aqui executa comando de sistema. Sem AppleScript, sem PowerShell, sem
 * `child_process`. O que a extensão precisa fazer no sistema (`abrir uma pasta`, `abrir
 * um link`) já é feito pelas ações do Raycast, que são multiplataforma.
 *
 * `process.platform` é a fonte: o `environment` do Raycast não expõe o sistema
 * (verificado em `@raycast/api` 1.104), e o runtime da extensão é Node. Toda função
 * recebe a plataforma como parâmetro com valor padrão, para que os testes não dependam
 * do sistema em que estão rodando.
 */

/** Os dois sistemas que o manifest declara. Qualquer outro cai no comportamento Windows. */
export type UiPlatform = "windows" | "macos";

/**
 * `process.platform` → o que a UI precisa saber.
 *
 * Só `darwin` vira `macos`. O Raycast não existe em Linux, então tratar o resto como
 * Windows é a degradação certa: o texto fica com `Ctrl`, que é o que um teclado não-Mac
 * tem de fato.
 */
export function toUiPlatform(platform: NodeJS.Platform = process.platform): UiPlatform {
  return platform === "darwin" ? "macos" : "windows";
}

/** Textos que dependem do sistema. Todos em inglês, em frase — nunca em Title Case. */
export interface PlatformCopy {
  platform: UiPlatform;
  /** Como o usuário chama o sistema: "Windows" / "macOS". */
  osName: string;
  /** O que a ação `Open the Hermes Folder` abre: "File Explorer" / "Finder". */
  fileManager: string;
  /** Editor de texto simples que já vem no sistema: "Notepad" / "TextEdit". */
  plainTextEditor: string;
  /** Copiar: `Ctrl+C` / `Cmd+C`. */
  copyKeys: string;
  /** Procurar dentro do editor: `Ctrl+F` / `Cmd+F`. */
  findKeys: string;
  /** Abrir o painel de ações do Raycast: `Ctrl+K` / `Cmd+K`. */
  actionsKeys: string;
  /** Enviar um formulário do Raycast: `Ctrl+Enter` / `Cmd+Enter`. */
  submitKeys: string;
  /** Frase inteira ensinando a revelar arquivos ocultos no gerenciador de arquivos. */
  showHiddenFilesHint: string;
}

const WINDOWS_COPY: PlatformCopy = {
  platform: "windows",
  osName: "Windows",
  fileManager: "File Explorer",
  plainTextEditor: "Notepad",
  copyKeys: "Ctrl+C",
  findKeys: "Ctrl+F",
  actionsKeys: "Ctrl+K",
  submitKeys: "Ctrl+Enter",
  showHiddenFilesHint: 'If you do not see the file, open "View" in File Explorer and tick "Hidden items".',
};

const MACOS_COPY: PlatformCopy = {
  platform: "macos",
  osName: "macOS",
  fileManager: "Finder",
  plainTextEditor: "TextEdit",
  copyKeys: "Cmd+C",
  findKeys: "Cmd+F",
  actionsKeys: "Cmd+K",
  submitKeys: "Cmd+Enter",
  showHiddenFilesHint: "If you do not see the file, press Cmd+Shift+. in Finder to reveal hidden files.",
};

/** Os textos do sistema atual. Passe a plataforma para testar o outro sem trocar de máquina. */
export function platformCopy(platform: UiPlatform = toUiPlatform()): PlatformCopy {
  return platform === "macos" ? MACOS_COPY : WINDOWS_COPY;
}
