/**
 * Duplo em memória de `@raycast/api` para os testes.
 *
 * Por que existe: o pacote `@raycast/api` instalado é SÓ tipos (`"types": "types/index.d.ts"`,
 * sem `main`). O runtime é injetado pelo host do Raycast na hora do `ray build`, então
 * qualquer módulo que o importe — `preferences.ts` e `storage.ts` — é impossível de carregar
 * sob `node --test` sem um substituto. `module-hooks.mjs` redireciona o especificador para
 * este arquivo.
 *
 * Implementa apenas a superfície que `src/lib/` usa: `getPreferenceValues`, `LocalStorage`
 * e `Cache`. Se um módulo novo precisar de mais, acrescente aqui.
 */

let preferences = {};
const localStorageStore = new Map();
const cacheStore = new Map();
let storageHooks = {};

/* ─────────────────────── Controles usados pelos testes ─────────────────────── */

export function __setPreferences(next) {
  preferences = { ...next };
}

export function __resetRaycastState() {
  preferences = {};
  localStorageStore.clear();
  cacheStore.clear();
  storageHooks = {};
}

export function __setLocalStorageHooks(next) {
  storageHooks = { ...next };
}

export function __localStorageSnapshot() {
  return Object.fromEntries(localStorageStore);
}

/* ────────────────────────── Superfície de @raycast/api ─────────────────────── */

export function getPreferenceValues() {
  return { ...preferences };
}

export const LocalStorage = {
  async getItem(key) {
    if (storageHooks.getItem) await storageHooks.getItem(key);
    return localStorageStore.has(key) ? localStorageStore.get(key) : undefined;
  },
  async setItem(key, value) {
    if (storageHooks.setItem) await storageHooks.setItem(key, value);
    localStorageStore.set(key, String(value));
  },
  async removeItem(key) {
    if (storageHooks.removeItem) await storageHooks.removeItem(key);
    localStorageStore.delete(key);
  },
  async allItems() {
    return Object.fromEntries(localStorageStore);
  },
  async clear() {
    localStorageStore.clear();
  },
};

export class Cache {
  constructor(options = {}) {
    this.namespace = options.namespace ?? "";
  }

  #scoped(key) {
    return `${this.namespace}:${key}`;
  }

  get(key) {
    return cacheStore.get(this.#scoped(key));
  }

  set(key, value) {
    cacheStore.set(this.#scoped(key), String(value));
  }

  remove(key) {
    return cacheStore.delete(this.#scoped(key));
  }

  clear() {
    cacheStore.clear();
  }
}

/* ─────────────────────────────── Keyboard ──────────────────────────────────── */

/**
 * `Keyboard.Shortcut.Common` e `.Reserved` transcritos do runtime que o app injeta.
 *
 * NÃO são invenção nem cópia da documentação: saíram de
 * `Raycast\api\node_modules\@raycast\api\index.js` do Raycast **2.0.3** no Windows
 * (`C:\Program Files\WindowsApps\Raycast.Raycast_2.0.3.0_x64__qypenmj9wpt2a\`), que é o
 * arquivo que o host carrega quando a extensão faz `import { Keyboard } from "@raycast/api"`.
 * O pacote `@raycast/api` do `node_modules` do projeto só tem tipos — os VALORES de
 * `Common.*` não existem em lugar nenhum que o `tsc` ou o `node --test` consigam ler.
 *
 * Por isso a tabela mora aqui: é a única forma de um teste afirmar para que teclas
 * `Common.Pin` realmente resolve em cada sistema. Se o Raycast mudar um destes valores
 * numa versão futura, o teste de §9.2 quebra — que é o comportamento desejado, porque a
 * tabela da UX-SPEC passaria a mentir. Reconferir com:
 *
 *   grep -o -P 'i\.Common=\{.{0,1400}' "<caminho acima>"
 */
export const Keyboard = {
  Shortcut: {
    Common: {
      Copy: { macOS: { modifiers: ["cmd", "shift"], key: "c" }, Windows: { modifiers: ["ctrl", "shift"], key: "c" } },
      CopyDeeplink: {
        macOS: { modifiers: ["cmd", "shift"], key: "c" },
        Windows: { modifiers: ["ctrl", "shift"], key: "c" },
      },
      CopyName: { macOS: { modifiers: ["cmd", "opt"], key: "c" }, Windows: { modifiers: ["ctrl", "alt"], key: "c" } },
      CopyPath: { macOS: { modifiers: ["cmd", "ctrl"], key: "c" }, Windows: { modifiers: ["alt", "shift"], key: "c" } },
      Save: { macOS: { modifiers: ["cmd"], key: "s" }, Windows: { modifiers: ["ctrl"], key: "s" } },
      Duplicate: { macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl", "shift"], key: "s" } },
      Edit: { macOS: { modifiers: ["cmd"], key: "e" }, Windows: { modifiers: ["ctrl"], key: "e" } },
      MoveDown: {
        macOS: { modifiers: ["cmd", "opt"], key: "arrowDown" },
        Windows: { modifiers: ["ctrl", "alt"], key: "arrowDown" },
      },
      MoveUp: {
        macOS: { modifiers: ["cmd", "opt"], key: "arrowUp" },
        Windows: { modifiers: ["ctrl", "alt"], key: "arrowUp" },
      },
      New: { macOS: { modifiers: ["cmd"], key: "n" }, Windows: { modifiers: ["ctrl"], key: "n" } },
      Open: { macOS: { modifiers: ["cmd"], key: "o" }, Windows: { modifiers: ["ctrl"], key: "o" } },
      OpenWith: {
        macOS: { modifiers: ["cmd", "shift"], key: "o" },
        Windows: { modifiers: ["ctrl", "shift"], key: "o" },
      },
      Pin: { macOS: { modifiers: ["cmd"], key: "." }, Windows: { modifiers: ["ctrl"], key: "." } },
      Refresh: { macOS: { modifiers: ["cmd"], key: "r" }, Windows: { modifiers: ["ctrl"], key: "r" } },
      Remove: { macOS: { modifiers: ["ctrl"], key: "x" }, Windows: { modifiers: ["ctrl"], key: "d" } },
      RemoveAll: {
        macOS: { modifiers: ["ctrl", "shift"], key: "x" },
        Windows: { modifiers: ["ctrl", "alt"], key: "d" },
      },
      ToggleQuickLook: { macOS: { modifiers: ["cmd"], key: "y" }, Windows: { modifiers: ["ctrl"], key: "y" } },
    },
    /**
     * Reservados do Raycast. A tabela do runtime é escrita em teclas de macOS (`cmd` em
     * toda linha) e o host compara normalizando `alt`→`opt` e `windows`→`cmd` — nunca
     * `ctrl`→`cmd`. Na prática nenhum atalho do bloco Windows, que só usa `ctrl`/`alt`/
     * `shift`, consegue colidir com esta lista; ela vale de verdade para o bloco macOS.
     */
    Reserved: {
      CloseWindow: { modifiers: ["cmd"], key: "w" },
      Delete: { modifiers: [], key: "delete" },
      DeleteForward: { modifiers: [], key: "deleteForward" },
      DeleteLineBackward: { modifiers: ["cmd"], key: "delete" },
      DeleteWordBackward: { modifiers: ["opt"], key: "delete" },
      GoBack: { modifiers: [], key: "escape" },
      OpenActionPanel: { modifiers: ["cmd"], key: "k" },
      OpenPreferences: { modifiers: ["cmd"], key: "," },
      OpenSearchBarDropdown: { modifiers: ["cmd"], key: "p" },
      OpenSearchBarLink: { modifiers: ["shift", "cmd"], key: "/" },
      PrimaryAction: { modifiers: [], key: "enter" },
      Quit: { modifiers: ["cmd"], key: "q" },
      ReturnToRoot: { modifiers: ["cmd"], key: "escape" },
      SecondaryAction: { modifiers: ["cmd"], key: "enter" },
      SelectAll: { modifiers: ["cmd"], key: "a" },
    },
  },
};
