/**
 * A tabela de teclado da UX-SPEC §9.2, em um lugar só — agora para os dois sistemas.
 *
 * Três regras que este módulo existe para garantir:
 * - **um significado, um atalho** em toda a extensão (§9.1). Quem precisar de
 *   "Copiar detalhes técnicos" em outra tela importa `SHORTCUTS.copyTechnical`,
 *   em vez de redigitar as teclas e divergir;
 * - **nunca `cmd` no bloco Windows** — lá um atalho com `cmd` é silenciosamente
 *   ignorado (pesquisa 07 §8.1). No Windows só entram `ctrl`, `shift` e `alt`;
 * - **nunca `ctrl` sozinho como modificador principal no bloco macOS** — no Mac o
 *   acelerador é `Cmd`, e `Ctrl` ali significa outra coisa.
 *
 * A separação NÃO é feita com `if (process.platform)`: a própria API do Raycast aceita
 * um atalho na forma `{ Windows, macOS }` e resolve no host. É o que `perPlatform()`
 * monta, e é por isso que a mesma constante serve às duas plataformas sem ramo em runtime.
 *
 * `Keyboard.Shortcut.Common.*` é preferido onde existe equivalente semântico, porque o
 * próprio Raycast já traduz esses para as teclas de cada sistema (07 §8.4). Os valores,
 * Windows/macOS, lidos do runtime que o app 2.0.3 injeta — não da documentação:
 * `Common.Copy` é `Ctrl+Shift+C`/`Cmd+Shift+C`; `Common.New`, `Ctrl+N`/`Cmd+N`;
 * `Common.Open`, `Ctrl+O`/`Cmd+O`; `Common.Refresh`, `Ctrl+R`/`Cmd+R`; `Common.Edit`,
 * `Ctrl+E`/`Cmd+E`; `Common.CopyPath`, `Alt+Shift+C`/`Cmd+Ctrl+C`; `Common.Pin`,
 * `Ctrl+.`/`Cmd+.`; `Common.Remove`, `Ctrl+D`/`Ctrl+X` — sim, `Ctrl+X` no Mac, é escolha
 * do Raycast e a única exceção à regra do `cmd` acima.
 *
 * Esses valores NÃO são legíveis pelo `tsc` nem pelo `node --test`: o `@raycast/api` do
 * `node_modules` só tem tipos. Estão transcritos, com a origem anotada, em
 * `tests/helpers/raycast-api-stub.mjs`, e `tests/shortcuts.test.ts` resolve a tabela toda
 * contra eles. Um comentário aqui não é fonte da verdade; aquele teste é.
 *
 * O mapeamento macOS **não** é uma troca cega de `ctrl` por `cmd`: `alt` vira `opt` (é a
 * mesma tecla física no Mac, mas o nome que a API espera é `opt`), e cada combinação foi
 * conferida contra os `Common.*` do macOS para não nascer colidindo — ver a nota em `stop`.
 *
 * Atalho aqui é **acelerador**: toda ação também está no `ActionPanel` (`Ctrl+K`/`Cmd+K`).
 */

import { Keyboard } from "@raycast/api";

type Combo = { modifiers: Keyboard.KeyModifier[]; key: Keyboard.KeyEquivalent };

/** Um atalho com teclas próprias em cada sistema, na forma que o Raycast resolve no host. */
function perPlatform(Windows: Combo, macOS: Combo): Keyboard.Shortcut {
  return { Windows, macOS };
}

export const SHORTCUTS = {
  /** `Copiar resposta` / `Copiar comando` / `Copiar o que já veio`. */
  copy: Keyboard.Shortcut.Common.Copy,
  /** `Colar no aplicativo ativo`. */
  paste: perPlatform({ modifiers: ["ctrl", "shift"], key: "v" }, { modifiers: ["cmd", "shift"], key: "v" }),
  /** `Continuar esta conversa`. */
  continueConversation: perPlatform(
    { modifiers: ["ctrl", "shift"], key: "return" },
    { modifiers: ["cmd", "shift"], key: "return" },
  ),
  /** `Nova conversa` / `Executar esta tarefa novamente`. */
  newConversation: Keyboard.Shortcut.Common.New,
  /** `Abrir no Hermes Desktop`. */
  openInDesktop: Keyboard.Shortcut.Common.Open,
  /**
   * `Parar`.
   *
   * Não divide tecla com nada. Uma versão anterior deste comentário afirmava que
   * `Cmd+Shift+P` era também o `Common.Pin` do macOS e construía uma justificativa de §9.3
   * em cima disso; `Common.Pin` é `Cmd+.`. A colisão nunca existiu, e o que a checava era
   * texto, não teclas. Quem confere agora é `tests/shortcuts.test.ts`, resolvendo os dois
   * atalhos para teclas concretas nos dois sistemas.
   */
  stop: perPlatform({ modifiers: ["ctrl", "shift"], key: "p" }, { modifiers: ["cmd", "shift"], key: "p" }),
  /** `Orientar execução`. */
  steer: perPlatform({ modifiers: ["ctrl", "shift"], key: "g" }, { modifiers: ["cmd", "shift"], key: "g" }),
  /** `Ver etapas` / `Ver resposta`. */
  toggleSteps: perPlatform({ modifiers: ["ctrl"], key: "t" }, { modifiers: ["cmd"], key: "t" }),
  /** `Mostrar detalhes técnicos`. */
  showTechnical: perPlatform({ modifiers: ["ctrl", "shift"], key: "i" }, { modifiers: ["cmd", "shift"], key: "i" }),
  /** `Copiar detalhes técnicos`. */
  copyTechnical: perPlatform({ modifiers: ["ctrl", "alt"], key: "c" }, { modifiers: ["cmd", "opt"], key: "c" }),
  /** `Atualizar` / `Tentar novamente`. */
  refresh: Keyboard.Shortcut.Common.Refresh,
  /** `Open Settings`. */
  preferences: perPlatform({ modifiers: ["ctrl", "shift"], key: "a" }, { modifiers: ["cmd", "shift"], key: "a" }),
  /** `Testar de novo` / `Testar conexão`. */
  testConnection: perPlatform({ modifiers: ["ctrl", "shift"], key: "t" }, { modifiers: ["cmd", "shift"], key: "t" }),
  /** `Detectar configuração automaticamente`. */
  autoDetect: perPlatform({ modifiers: ["ctrl", "shift"], key: "d" }, { modifiers: ["cmd", "shift"], key: "d" }),
  /** `Excluir conversa` / `Remover da lista` / `Esquecer a chave detectada`. */
  remove: Keyboard.Shortcut.Common.Remove,
  /** `Abrir a pasta do Hermes`. */
  hermesFolder: perPlatform({ modifiers: ["ctrl", "shift"], key: "f" }, { modifiers: ["cmd", "shift"], key: "f" }),
  /** `Copiar o caminho do arquivo` — o caminho, nunca o conteúdo. */
  copyPath: Keyboard.Shortcut.Common.CopyPath,
  /** `Renomear conversa`. */
  rename: Keyboard.Shortcut.Common.Edit,
  /** `Ramificar conversa`. */
  branch: perPlatform({ modifiers: ["ctrl", "shift"], key: "b" }, { modifiers: ["cmd", "shift"], key: "b" }),
  /** `Usar só na próxima pergunta` — §2.6. `Usar como modelo padrão` é o `Enter` da lista. */
  nextTurnModel: perPlatform({ modifiers: ["ctrl", "shift"], key: "m" }, { modifiers: ["cmd", "shift"], key: "m" }),
  /** `Ver tarefas em andamento`. */
  activeRuns: perPlatform({ modifiers: ["ctrl", "shift"], key: "e" }, { modifiers: ["cmd", "shift"], key: "e" }),
  /** `Negar` (aprovação). */
  deny: perPlatform({ modifiers: ["ctrl", "shift"], key: "n" }, { modifiers: ["cmd", "shift"], key: "n" }),
  /** `Aprovar durante esta execução`. */
  approveSession: perPlatform({ modifiers: ["alt", "shift"], key: "e" }, { modifiers: ["opt", "shift"], key: "e" }),
  /** `Aprovar sempre este tipo de comando` — ação destrutiva. */
  approveAlways: perPlatform({ modifiers: ["alt", "shift"], key: "s" }, { modifiers: ["opt", "shift"], key: "s" }),
  /** `Fixar conversa` / `Desafixar conversa` — `Common.Pin` é `Ctrl+.`/`Cmd+.`. */
  pin: Keyboard.Shortcut.Common.Pin,
  /** `Arquivar conversa` / `Desarquivar conversa`. */
  archive: perPlatform({ modifiers: ["alt"], key: "a" }, { modifiers: ["opt"], key: "a" }),
  /**
   * `Load the Earlier Part of the Conversation` — significado novo, atalho novo (§9.1).
   * Não colide com nada da tabela §9.2 nem com o que o Raycast reserva.
   */
  loadOlder: perPlatform({ modifiers: ["ctrl", "shift"], key: "h" }, { modifiers: ["cmd", "shift"], key: "h" }),
  /**
   * `Ver mensagens e ferramentas` — o detalhe da conversa, que virou ação secundária
   * (desenho da conversa contínua §12).
   *
   * **Divide a tecla com `autoDetect`, e isso é deliberado.** O desenho fixou
   * `Ctrl+Shift+D` para esta ação afirmando que ele estava livre; não estava. Mantivemos a
   * decisão porque a §9.3 já admite o mesmo atalho com dois significados quando eles nunca
   * aparecem na mesma tela — é assim que `Ctrl+Alt+C` serve a "Copiar detalhes técnicos" e
   * a "Copiar conversa inteira". A separação aqui é real e precisa continuar sendo:
   * `Detectar configuração automaticamente` só existe na tela de primeiro uso, na tela de
   * conexão e no erro E2 em tela cheia — três telas que não têm conversa, e portanto não
   * têm mensagens para ver. **Nunca coloque as duas ações no mesmo `ActionPanel`.**
   */
  viewMessages: perPlatform({ modifiers: ["ctrl", "shift"], key: "d" }, { modifiers: ["cmd", "shift"], key: "d" }),
} satisfies Record<string, Keyboard.Shortcut>;
