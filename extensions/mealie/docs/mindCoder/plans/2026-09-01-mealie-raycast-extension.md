# Mealie-Raycast-Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use mindCoder:subagent-driven-development (recommended) or mindCoder:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine Raycast-Extension, die Mealie-Einkaufslisten und -Essensplan verwaltet, Rezepte per URL importiert und Rezepte durchsuchbar macht, wobei Enter die Mealie-Rezeptseite öffnet.

**Architecture:** Dünne Command-Komponenten über einer getypten API-Schicht. `src/api/` ist vollständig frei von `@raycast/api`-Importen und bekommt seine Konfiguration injiziert, damit die gesamte Netz- und Mapping-Logik unter Vitest testbar bleibt. Lesen läuft über `useCachedPromise`, Schreiben über `mutate` mit Optimistic Update.

**Tech Stack:** TypeScript 5.9, React 19, `@raycast/api` 2.x, `@raycast/utils` 2.x, Vitest 4, ESLint 9 mit `@raycast/eslint-config`.

**Spec:** `docs/mindCoder/specs/2026-09-01-mealie-raycast-design.md`

## Global Constraints

Diese Regeln gelten für **jede** Task. Sie werden nicht in jeder Task wiederholt.

1. **`src/api/**` und `src/lib/**` importieren niemals `@raycast/api`.** `@raycast/api` ist ein natives Modul und in Vitest nicht ladbar. Konfiguration wird als Parameter übergeben, nie per `getPreferenceValues()` aus der API-Schicht heraus geholt. Einzige Brücke ist `src/preferences.ts`.
2. **Versionen exakt so:** `typescript@5.9.3` (NICHT 7.x, `@raycast/eslint-config` verlangt `>=4.8.4 <6.1.0`), `@types/node@22.19.17`, `@types/react@19.0.10`, `react@19.x`. Node `>=22.22.2`.
3. **Deutsch in Commit-Messages und Doku, Englisch in Code, UI-Strings und Bezeichnern.** Raycast-Commands sind englisch benannt (Store-Konvention).
4. **Kein Geviertstrich** in irgendeinem Text, weder in Doku noch in UI-Strings.
5. **Niemals Token, Auth-Header oder vollständige Request-URLs** in Fehlermeldungen, Toasts oder `console.*` ausgeben.
6. **Keine echten IDs, Hostnamen oder Nutzdaten aus Joschkas Instanz** in Code, Tests oder Fixtures. Dieses Repo ist öffentlich. Fixtures verwenden erfundene UUIDs im Format `00000000-0000-4000-8000-0000000000NN`.
7. **TDD:** Für jede Logik in `src/api/` und `src/lib/` zuerst der fehlschlagende Test, dann die Implementierung. UI-Komponenten werden nicht unit-getestet.
8. **Commit nach jeder Task**, Conventional-Commits-Präfix (`feat:`, `test:`, `chore:`, `docs:`, `fix:`).

## Abweichungen bei der Ausfuehrung

Festgehalten am 2026-09-01 waehrend der Umsetzung:

- **Reihenfolge geaendert.** Nach Task 6 wurde Task 10 (Essensplan) vorgezogen,
  weil Joschka die Rezept-Action "auf einen Tag einplanen" angefordert hat und
  diese an der Essensplan-API haengt. Die Tasks 7 bis 9 (Einkaufslisten) folgen
  danach.
- **`PlanRecipeAction` statt des Meal-Plan-Teils von `AddRecipeActions`.** Die
  Action liegt in `src/components/PlanRecipeAction.tsx` und ist bereits in
  `search-recipes.tsx` verdrahtet. Task 12 muss davon nur noch den
  Einkaufslisten-Teil ergaenzen, nicht die ganze Komponente.
- **Platzhalter-Commands.** `ray build` verlangt fuer jeden Eintrag in der
  `package.json` eine Datei. Die noch nicht gebauten Commands liegen als
  Attrappe in `src/` und werden in ihrer jeweiligen Task ersetzt.
- **`onError` braucht einen Block-Body.** `showFailureToast` liefert
  `Promise<Toast>`, `onError` erwartet `void | Promise<void>`.
- **Task 12 aufgeteilt.** Der Meal-Plan-Teil liegt in `PlanRecipeAction.tsx`,
  der Einkaufslisten-Teil in `AddIngredientsAction.tsx`, statt beides in einer
  Komponente `AddRecipeActions`. Beide sind in `search-recipes.tsx` und
  `import-recipe.tsx` verdrahtet.
- **`quantity`-Default ist 0, nicht 1.** In den Live-Daten der Zielinstanz haben
  drei von vier Items `quantity: 0`; Mealie zeigt dann den blanken Namen.
- **Store-Readiness ist unvollstaendig.** Author-Handle und Screenshots fehlen,
  beides braucht Joschka. Siehe `STORE-CHECKLIST.md`.
- **`ray lint` meldet `Invalid author`.** Der Handle in der `package.json` ist
  nicht gegen das Raycast-Nutzerverzeichnis geprueft. Betrifft nur Lint und eine
  spaetere Store-Publikation, nicht Entwicklung oder Build.

## Verifizierte API-Fakten

Gegen `https://demo.mealie.io/openapi.json` am 2026-09-01 geprüft. Diese Werte nicht aus dem Gedächtnis abweichen lassen.

| Zweck | Methode und Pfad |
|---|---|
| Version | `GET /api/app/about` |
| Eigener Nutzer, liefert `groupSlug` | `GET /api/users/self` |
| Einkaufslisten | `GET,POST /api/households/shopping/lists` |
| Eine Liste **inklusive Items und labelSettings** | `GET,PUT,DELETE /api/households/shopping/lists/{id}` |
| Item anlegen | `POST /api/households/shopping/items` |
| Item ändern/löschen | `PUT,DELETE /api/households/shopping/items/{id}` |
| Rezept auf Liste | `POST /api/households/shopping/lists/{id}/recipe/{recipeId}` |
| Essensplan | `GET,POST /api/households/mealplans` mit `start_date`/`end_date` |
| Essensplan-Eintrag | `GET,PUT,DELETE /api/households/mealplans/{id}` |
| Rezepte | `GET /api/recipes` mit `search`, `page`, `perPage` |
| Foods | `GET /api/foods` mit `page`, `perPage` |
| Import per URL | `POST /api/recipes/create/url` |

**Drei Fallstricke, die aus der OpenAPI-Prüfung stammen:**

1. **`ShoppingListItemUpdate` hat Defaults auf allen Feldern** (`quantity: 1`, `note: ""`, `checked: false`, `position: 0`). Ein PUT mit nur `{ checked: true }` setzt `quantity` auf 1 und leert `note`. **Beim Abhaken muss das vollständige Item zurückgeschickt werden.** Dafür gibt es `toItemUpdatePayload()` in Task 7.
2. **`GET /api/households/shopping/items` kennt keinen `shoppingListId`-Parameter**, nur Mealies `queryFilter`-DSL. Deshalb wird die Item-Liste über `GET /api/households/shopping/lists/{id}` geholt, was Items und `labelSettings` in einem Request liefert.
3. **`PlanEntryType` hat in der Nightly-Demo 7 Werte:** `breakfast, lunch, dinner, side, snack, drink, dessert`. In Joschkas Instanz sind nur die ersten vier belegt gesehen worden. Die Extension bietet alle sieben an; lehnt eine ältere Instanz einen Wert mit HTTP 422 ab, zeigt der Fehler-Toast den Grund. Nicht raten, nicht hart auf vier kürzen.

---

### Task 1: Projekt-Scaffold und Preferences

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, `.prettierrc`, `src/preferences.ts`, `assets/extension-icon.png`

**Interfaces:**
- Consumes: nichts
- Produces: `getMealieConfig(): MealieConfig` aus `src/preferences.ts`; npm-Skripte `dev`, `build`, `lint`, `test`

- [ ] **Step 1: `package.json` anlegen**

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "mealie",
  "title": "Mealie",
  "description": "Manage Mealie shopping lists and meal plans, import recipes and search your recipe collection.",
  "icon": "extension-icon.png",
  "author": "joschkarick",
  "categories": ["Productivity"],
  "license": "MIT",
  "commands": [
    {
      "name": "search-recipes",
      "title": "Search Recipes",
      "subtitle": "Mealie",
      "description": "Search your Mealie recipes and open them in the browser.",
      "mode": "view"
    },
    {
      "name": "add-to-shopping-list",
      "title": "Add to Shopping List",
      "subtitle": "Mealie",
      "description": "Quickly add an item to a Mealie shopping list.",
      "mode": "view"
    },
    {
      "name": "shopping-lists",
      "title": "Shopping Lists",
      "subtitle": "Mealie",
      "description": "Browse and manage your Mealie shopping lists.",
      "mode": "view"
    },
    {
      "name": "meal-plan",
      "title": "Meal Plan",
      "subtitle": "Mealie",
      "description": "View and edit your Mealie meal plan for the week.",
      "mode": "view"
    },
    {
      "name": "import-recipe",
      "title": "Import Recipe",
      "subtitle": "Mealie",
      "description": "Import a recipe into Mealie from a URL.",
      "mode": "view"
    }
  ],
  "preferences": [
    {
      "name": "mealieUrl",
      "title": "Mealie URL",
      "description": "Base URL of your Mealie instance, for example https://mealie.example.org",
      "type": "textfield",
      "required": true,
      "placeholder": "https://mealie.example.org"
    },
    {
      "name": "apiToken",
      "title": "API Token",
      "description": "Mealie API token. Create one in Mealie under Settings, API Tokens.",
      "type": "password",
      "required": true
    },
    {
      "name": "allowInsecureHttp",
      "title": "Insecure Connections",
      "label": "Allow plain HTTP outside localhost",
      "description": "Only enable this if your Mealie instance is reachable over HTTP inside a trusted network. Your API token is sent unencrypted.",
      "type": "checkbox",
      "required": false,
      "default": false
    }
  ],
  "dependencies": {
    "@raycast/api": "^2.1.2",
    "@raycast/utils": "^2.3.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^2.2.0",
    "@types/node": "22.19.17",
    "@types/react": "19.0.10",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0",
    "typescript": "5.9.3",
    "vitest": "^4.1.11"
  },
  "scripts": {
    "build": "ray build",
    "dev": "ray develop",
    "lint": "ray lint",
    "fix-lint": "ray lint --fix",
    "publish": "npx @raycast/api@latest publish",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: `tsconfig.json` anlegen**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "include": ["src/**/*", "raycast-env.d.ts"],
  "compilerOptions": {
    "lib": ["ES2023"],
    "module": "ES2022",
    "target": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true
  }
}
```

- [ ] **Step 3: `vitest.config.ts` anlegen**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: `eslint.config.js` und `.prettierrc` anlegen**

`eslint.config.js`:

```js
import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([...raycastConfig]);
```

`.prettierrc`:

```json
{
  "printWidth": 120,
  "singleQuote": false,
  "semi": true
}
```

- [ ] **Step 5: Abhängigkeiten installieren**

Run: `npm install`
Expected: Kein Fehler. Falls npm über `typescript` meckert, prüfen, dass `5.9.3` und nicht `^7` in `package.json` steht.

- [ ] **Step 6: Extension-Icon anlegen**

Ein 512x512 PNG nach `assets/extension-icon.png` legen. Platzhalter erzeugen, falls kein Design vorliegt:

```bash
mkdir -p assets
/usr/bin/python3 -c "
import struct, zlib
w = h = 512
px = bytearray()
for y in range(h):
    px.append(0)
    for x in range(w):
        px.extend((45, 125, 70))
raw = zlib.compress(bytes(px), 9)
def chunk(t, d):
    c = t + d
    return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c))
png = (b'\x89PNG\r\n\x1a\n'
       + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
       + chunk(b'IDAT', raw) + chunk(b'IEND', b''))
open('assets/extension-icon.png','wb').write(png)
"
```

- [ ] **Step 7: `src/preferences.ts` anlegen**

Dies ist die **einzige** Datei, die `@raycast/api` mit `getPreferenceValues` berührt. Sie wird nicht unit-getestet.

```ts
import { getPreferenceValues } from "@raycast/api";
import { normalizeBaseUrl, type MealieConfig } from "./api/client";

interface RawPreferences {
  mealieUrl: string;
  apiToken: string;
  allowInsecureHttp?: boolean;
}

export function getMealieConfig(): MealieConfig {
  const prefs = getPreferenceValues<RawPreferences>();
  return {
    baseUrl: normalizeBaseUrl(prefs.mealieUrl),
    token: prefs.apiToken.trim(),
    allowInsecureHttp: prefs.allowInsecureHttp === true,
  };
}
```

- [ ] **Step 8: Verifizieren, dass das Scaffold trägt**

Run: `npx tsc --noEmit`
Expected: Fehler nur zu noch nicht existierendem `./api/client`. Das ist an dieser Stelle erwartet und wird in Task 2 aufgelöst.

Run: `npx vitest run`
Expected: `No test files found` und Exit-Code 0 beziehungsweise die Meldung, dass keine Tests existieren.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts eslint.config.js .prettierrc src/preferences.ts assets/extension-icon.png
git commit -m "chore: Raycast-Scaffold, Preferences und Test-Setup"
```

---

### Task 2: HTTP-Client mit Auth, HTTPS-Guard und Fehler-Mapping

Das Herzstück. Alles Weitere hängt davon ab. Die Datei importiert bewusst kein `@raycast/api` und bekommt `fetch` injiziert, damit sie vollständig testbar ist.

**Files:**
- Create: `src/api/client.ts`
- Test: `src/api/client.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `interface MealieConfig { baseUrl: string; token: string; allowInsecureHttp: boolean }`
  - `class MealieError extends Error { kind: MealieErrorKind; status?: number }`
  - `type MealieErrorKind = "config" | "auth" | "notFound" | "badRequest" | "server" | "network"`
  - `normalizeBaseUrl(raw: string): string`
  - `assertSecureUrl(baseUrl: string, allowInsecureHttp: boolean): void`
  - `buildUrl(baseUrl: string, path: string, query?: QueryParams): string`
  - `createMealieClient(config: MealieConfig, fetchImpl?: typeof fetch): MealieClient`
  - `interface MealieClient { get<T>(path, query?): Promise<T>; post<T>(path, body?): Promise<T>; put<T>(path, body?): Promise<T>; del(path): Promise<void>; getAllPages<T>(path, query?, pageSize?): Promise<T[]> }`
  - `interface PaginatedResponse<T> { items: T[]; page: number; total: number; total_pages: number; next: string | null }`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`src/api/client.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { assertSecureUrl, buildUrl, createMealieClient, MealieError, normalizeBaseUrl } from "./client";

const config = { baseUrl: "https://mealie.example.org", token: "t0ken", allowInsecureHttp: false };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("normalizeBaseUrl", () => {
  it("strips trailing slashes", () => {
    expect(normalizeBaseUrl("https://mealie.example.org/")).toBe("https://mealie.example.org");
    expect(normalizeBaseUrl("https://mealie.example.org///")).toBe("https://mealie.example.org");
  });

  it("strips a trailing /api because paths already carry it", () => {
    expect(normalizeBaseUrl("https://mealie.example.org/api")).toBe("https://mealie.example.org");
  });

  it("assumes https when no scheme is given", () => {
    expect(normalizeBaseUrl("mealie.example.org")).toBe("https://mealie.example.org");
  });

  it("rejects an empty value", () => {
    expect(() => normalizeBaseUrl("   ")).toThrow(MealieError);
  });
});

describe("assertSecureUrl", () => {
  it("accepts https", () => {
    expect(() => assertSecureUrl("https://mealie.example.org", false)).not.toThrow();
  });

  it("accepts http on localhost", () => {
    expect(() => assertSecureUrl("http://localhost:9000", false)).not.toThrow();
    expect(() => assertSecureUrl("http://127.0.0.1:9000", false)).not.toThrow();
  });

  it("refuses http elsewhere so the token is not sent in the clear", () => {
    expect(() => assertSecureUrl("http://mealie.example.org", false)).toThrow(/HTTPS/i);
  });

  it("allows http elsewhere once the user opted in", () => {
    expect(() => assertSecureUrl("http://mealie.example.org", true)).not.toThrow();
  });
});

describe("buildUrl", () => {
  it("appends query parameters and skips empty ones", () => {
    const url = buildUrl("https://mealie.example.org", "/api/recipes", { search: "pasta", page: 1, tags: undefined });
    expect(url).toBe("https://mealie.example.org/api/recipes?search=pasta&page=1");
  });
});

describe("createMealieClient", () => {
  it("sends the bearer token and parses JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "abc" }));
    const client = createMealieClient(config, fetchMock as unknown as typeof fetch);

    const result = await client.get<{ id: string }>("/api/users/self");

    expect(result).toEqual({ id: "abc" });
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t0ken");
  });

  it("maps 401 to an auth error without leaking the token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ detail: "Not authenticated" }, 401));
    const client = createMealieClient(config, fetchMock as unknown as typeof fetch);

    await expect(client.get("/api/users/self")).rejects.toMatchObject({ kind: "auth", status: 401 });
    await expect(client.get("/api/users/self")).rejects.not.toThrow(/t0ken/);
  });

  it("surfaces Mealie's own message on 400 so a failed import is explainable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ detail: "Could not parse recipe" }, 400));
    const client = createMealieClient(config, fetchMock as unknown as typeof fetch);

    await expect(client.post("/api/recipes/create/url", { url: "x" })).rejects.toMatchObject({
      kind: "badRequest",
      message: "Could not parse recipe",
    });
  });

  it("maps a thrown fetch to a network error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("failed to fetch"));
    const client = createMealieClient(config, fetchMock as unknown as typeof fetch);

    await expect(client.get("/api/users/self")).rejects.toMatchObject({ kind: "network" });
  });

  it("returns void for 204 responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const client = createMealieClient(config, fetchMock as unknown as typeof fetch);

    await expect(client.del("/api/foods/1")).resolves.toBeUndefined();
  });

  it("walks every page in getAllPages", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [{ n: 1 }], page: 1, total: 2, total_pages: 2, next: "x" }))
      .mockResolvedValueOnce(jsonResponse({ items: [{ n: 2 }], page: 2, total: 2, total_pages: 2, next: null }));
    const client = createMealieClient(config, fetchMock as unknown as typeof fetch);

    await expect(client.getAllPages<{ n: number }>("/api/foods")).resolves.toEqual([{ n: 1 }, { n: 2 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Test laufen lassen und Fehlschlag bestätigen**

Run: `npx vitest run src/api/client.test.ts`
Expected: FAIL, `Failed to resolve import "./client"`

- [ ] **Step 3: `src/api/client.ts` implementieren**

```ts
export interface MealieConfig {
  baseUrl: string;
  token: string;
  allowInsecureHttp: boolean;
}

export type MealieErrorKind = "config" | "auth" | "notFound" | "badRequest" | "server" | "network";

export class MealieError extends Error {
  readonly kind: MealieErrorKind;
  readonly status?: number;

  constructor(message: string, kind: MealieErrorKind, status?: number) {
    super(message);
    this.name = "MealieError";
    this.kind = kind;
    this.status = status;
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  total: number;
  total_pages: number;
  next: string | null;
}

export interface MealieClient {
  get<T>(path: string, query?: QueryParams): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  del(path: string): Promise<void>;
  getAllPages<T>(path: string, query?: QueryParams, pageSize?: number): Promise<T[]>;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const MAX_PAGES = 50;

export function normalizeBaseUrl(raw: string): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) {
    throw new MealieError("No Mealie URL is configured.", "config");
  }
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed;
  return withScheme.replace(/\/api$/i, "").replace(/\/+$/, "");
}

export function assertSecureUrl(baseUrl: string, allowInsecureHttp: boolean): void {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new MealieError("The Mealie URL is not a valid URL.", "config");
  }
  if (url.protocol === "https:") return;
  if (url.protocol !== "http:") {
    throw new MealieError("The Mealie URL must use HTTPS.", "config");
  }
  if (LOCAL_HOSTS.has(url.hostname) || allowInsecureHttp) return;
  throw new MealieError(
    "Refusing to send your API token over plain HTTP. Use HTTPS, or allow insecure connections in the extension preferences.",
    "config",
  );
}

export function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  const url = new URL(baseUrl + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function readDetail(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    const detail = body?.detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim().slice(0, 300);
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: unknown };
      if (typeof first?.msg === "string") return first.msg.slice(0, 300);
    }
  } catch {
    // Antwort war kein JSON. Der generische Text unten reicht dann.
  }
  return undefined;
}

async function toMealieError(response: Response): Promise<MealieError> {
  const status = response.status;
  if (status === 401 || status === 403) {
    return new MealieError("Your Mealie API token was rejected. Check it in the extension preferences.", "auth", status);
  }
  if (status === 404) {
    return new MealieError("Mealie returned 404. Check that the URL points at a Mealie instance.", "notFound", status);
  }
  if (status === 400 || status === 422) {
    const detail = await readDetail(response);
    return new MealieError(detail ?? "Mealie rejected the request.", "badRequest", status);
  }
  return new MealieError("Mealie responded with HTTP " + status + ".", "server", status);
}

export function createMealieClient(config: MealieConfig, fetchImpl: typeof fetch = fetch): MealieClient {
  async function request<T>(
    method: string,
    path: string,
    options: { body?: unknown; query?: QueryParams } = {},
  ): Promise<T> {
    assertSecureUrl(config.baseUrl, config.allowInsecureHttp);
    if (!config.token) {
      throw new MealieError("No API token is configured.", "config");
    }

    const headers: Record<string, string> = {
      Authorization: "Bearer " + config.token,
      Accept: "application/json",
    };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await fetchImpl(buildUrl(config.baseUrl, path, options.query), {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch {
      // Die ursprüngliche Fehlermeldung wird bewusst verworfen, sie kann die URL enthalten.
      throw new MealieError("Could not reach your Mealie instance. Check the URL and your network.", "network");
    }

    if (!response.ok) throw await toMealieError(response);
    if (response.status === 204) return undefined as T;

    const text = await response.text();
    return (text ? (JSON.parse(text) as T) : (undefined as T));
  }

  return {
    get: (path, query) => request("GET", path, { query }),
    post: (path, body) => request("POST", path, { body }),
    put: (path, body) => request("PUT", path, { body }),
    del: async (path) => {
      await request<void>("DELETE", path);
    },
    async getAllPages<T>(path: string, query?: QueryParams, pageSize = 100): Promise<T[]> {
      const collected: T[] = [];
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const response = await request<PaginatedResponse<T>>("GET", path, {
          query: { ...query, page, perPage: pageSize },
        });
        const items = response.items ?? [];
        collected.push(...items);
        if (items.length === 0 || page >= (response.total_pages ?? 1)) break;
      }
      return collected;
    },
  };
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/api/client.test.ts`
Expected: PASS, 13 Tests grün.

Run: `npx tsc --noEmit`
Expected: Keine Fehler mehr, auch nicht in `src/preferences.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/api/client.ts src/api/client.test.ts
git commit -m "feat: HTTP-Client mit Auth, HTTPS-Guard und Fehler-Mapping"
```

---

### Task 3: Typen, Instanz-Metadaten und URL-Helper

**Files:**
- Create: `src/types.ts`, `src/api/meta.ts`, `src/lib/urls.ts`
- Test: `src/lib/urls.test.ts`

**Interfaces:**
- Consumes: `MealieClient` aus `src/api/client.ts`
- Produces:
  - `src/types.ts`: `RecipeSummary`, `MultiPurposeLabel`, `IngredientFood`, `IngredientUnit`, `ShoppingList`, `ShoppingListDetail`, `ShoppingListItem`, `LabelSetting`, `MealPlanEntry`, `PlanEntryType`, `PLAN_ENTRY_TYPES`
  - `src/api/meta.ts`: `getSelf(client: MealieClient): Promise<SelfInfo>`, `getAbout(client): Promise<AboutInfo>`, `interface SelfInfo { id, username, groupSlug, householdSlug }`
  - `src/lib/urls.ts`: `recipeWebUrl(baseUrl, groupSlug, slug): string`, `recipeImageUrl(baseUrl, recipe): string | undefined`, `shoppingListWebUrl(baseUrl, groupSlug, listId): string`

- [ ] **Step 1: `src/types.ts` anlegen**

Die Felder stammen aus der verifizierten OpenAPI-Spec. Nur was die Extension wirklich liest, wird typisiert.

```ts
export const PLAN_ENTRY_TYPES = ["breakfast", "lunch", "dinner", "side", "snack", "drink", "dessert"] as const;
export type PlanEntryType = (typeof PLAN_ENTRY_TYPES)[number];

export interface MultiPurposeLabel {
  id: string;
  name: string;
  color: string;
}

export interface IngredientFood {
  id: string;
  name: string;
  pluralName: string | null;
  labelId: string | null;
  label: MultiPurposeLabel | null;
}

export interface IngredientUnit {
  id: string;
  name: string;
  abbreviation: string | null;
}

export interface RecipeTag {
  id: string;
  name: string;
  slug: string;
}

export interface RecipeSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  orgURL: string | null;
  rating: number | null;
  totalTime: string | null;
  lastMade: string | null;
  tags: RecipeTag[] | null;
  recipeCategory: RecipeTag[] | null;
}

export interface LabelSetting {
  labelId: string;
  position: number;
  label: MultiPurposeLabel;
}

export interface ShoppingList {
  id: string;
  name: string;
  labelSettings: LabelSetting[];
}

export interface ShoppingListItem {
  id: string;
  shoppingListId: string;
  checked: boolean;
  position: number;
  quantity: number;
  note: string | null;
  display: string;
  foodId: string | null;
  food: IngredientFood | null;
  labelId: string | null;
  label: MultiPurposeLabel | null;
  unitId: string | null;
  unit: IngredientUnit | null;
}

export interface ShoppingListDetail extends ShoppingList {
  listItems: ShoppingListItem[];
}

export interface MealPlanEntry {
  id: number;
  date: string;
  entryType: PlanEntryType;
  title: string;
  text: string;
  recipeId: string | null;
  recipe: RecipeSummary | null;
}
```

- [ ] **Step 2: Den fehlschlagenden Test für die URL-Helper schreiben**

`src/lib/urls.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { recipeImageUrl, recipeWebUrl, shoppingListWebUrl } from "./urls";

const base = "https://mealie.example.org";

describe("recipeWebUrl", () => {
  it("builds the Mealie recipe page URL", () => {
    expect(recipeWebUrl(base, "home", "blech-pizza")).toBe("https://mealie.example.org/g/home/r/blech-pizza");
  });
});

describe("shoppingListWebUrl", () => {
  it("builds the shopping list URL", () => {
    expect(shoppingListWebUrl(base, "home", "abc")).toBe("https://mealie.example.org/g/home/shopping-lists/abc");
  });
});

describe("recipeImageUrl", () => {
  const recipe = { id: "00000000-0000-4000-8000-000000000001", image: "gUkp" };

  it("builds a media URL from an image token", () => {
    expect(recipeImageUrl(base, recipe)).toBe(
      "https://mealie.example.org/api/media/recipes/00000000-0000-4000-8000-000000000001/images/min-original.webp",
    );
  });

  it("returns undefined when there is no image", () => {
    expect(recipeImageUrl(base, { id: "x", image: null })).toBeUndefined();
  });

  it("treats Mealie's literal 'no image' placeholder as no image", () => {
    expect(recipeImageUrl(base, { id: "x", image: "no image" })).toBeUndefined();
  });

  it("treats an empty string as no image", () => {
    expect(recipeImageUrl(base, { id: "x", image: "   " })).toBeUndefined();
  });
});
```

- [ ] **Step 3: Test laufen lassen und Fehlschlag bestätigen**

Run: `npx vitest run src/lib/urls.test.ts`
Expected: FAIL, `Failed to resolve import "./urls"`

- [ ] **Step 4: `src/lib/urls.ts` implementieren**

```ts
export function recipeWebUrl(baseUrl: string, groupSlug: string, slug: string): string {
  return baseUrl + "/g/" + groupSlug + "/r/" + slug;
}

export function shoppingListWebUrl(baseUrl: string, groupSlug: string, listId: string): string {
  return baseUrl + "/g/" + groupSlug + "/shopping-lists/" + listId;
}

/**
 * Mealie liefert im Feld `image` entweder ein kurzes Token, `null` oder den
 * Literalwert "no image". Alle drei Fälle sind in echten Daten belegt.
 */
export function recipeImageUrl(baseUrl: string, recipe: { id: string; image: string | null }): string | undefined {
  const token = recipe.image?.trim();
  if (!token || token === "no image") return undefined;
  return baseUrl + "/api/media/recipes/" + recipe.id + "/images/min-original.webp";
}
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run src/lib/urls.test.ts`
Expected: PASS, 6 Tests grün.

- [ ] **Step 6: `src/api/meta.ts` implementieren**

```ts
import type { MealieClient } from "./client";

export interface SelfInfo {
  id: string;
  username: string;
  groupSlug: string;
  householdSlug: string;
}

export interface AboutInfo {
  version: string;
}

/** Liefert unter anderem den groupSlug, den die Rezept-Web-URL braucht. Nicht raten. */
export function getSelf(client: MealieClient): Promise<SelfInfo> {
  return client.get<SelfInfo>("/api/users/self");
}

export function getAbout(client: MealieClient): Promise<AboutInfo> {
  return client.get<AboutInfo>("/api/app/about");
}
```

- [ ] **Step 7: Typprüfung und Commit**

Run: `npx tsc --noEmit`
Expected: Keine Fehler.

```bash
git add src/types.ts src/api/meta.ts src/lib/urls.ts src/lib/urls.test.ts
git commit -m "feat: Typen, Instanz-Metadaten und URL-Helper"
```

---

### Task 4: Rezept-API

**Files:**
- Create: `src/api/recipes.ts`
- Test: `src/api/recipes.test.ts`

**Interfaces:**
- Consumes: `MealieClient`, `PaginatedResponse` aus `src/api/client.ts`; `RecipeSummary` aus `src/types.ts`
- Produces:
  - `searchRecipes(client: MealieClient, search: string, perPage?: number): Promise<RecipeSummary[]>`
  - `importRecipeFromUrl(client: MealieClient, url: string, includeTags: boolean): Promise<string>`: Rückgabe ist der **Slug**, nicht das Rezept
  - `getRecipe(client: MealieClient, slug: string): Promise<RecipeSummary>`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`src/api/recipes.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { getRecipe, importRecipeFromUrl, searchRecipes } from "./recipes";
import type { MealieClient } from "./client";

function clientStub(overrides: Partial<MealieClient>): MealieClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    getAllPages: vi.fn(),
    ...overrides,
  } as MealieClient;
}

describe("searchRecipes", () => {
  it("passes the search term and returns items", async () => {
    const get = vi.fn().mockResolvedValue({ items: [{ id: "1", name: "Pizza" }], page: 1, total: 1, total_pages: 1 });
    const client = clientStub({ get });

    await expect(searchRecipes(client, "pizza")).resolves.toEqual([{ id: "1", name: "Pizza" }]);
    expect(get).toHaveBeenCalledWith("/api/recipes", { search: "pizza", page: 1, perPage: 50 });
  });

  it("omits the search parameter when the term is blank", async () => {
    const get = vi.fn().mockResolvedValue({ items: [], page: 1, total: 0, total_pages: 1 });
    const client = clientStub({ get });

    await searchRecipes(client, "   ");
    expect(get).toHaveBeenCalledWith("/api/recipes", { search: undefined, page: 1, perPage: 50 });
  });

  it("tolerates a response without items", async () => {
    const client = clientStub({ get: vi.fn().mockResolvedValue({}) });
    await expect(searchRecipes(client, "x")).resolves.toEqual([]);
  });
});

describe("importRecipeFromUrl", () => {
  it("posts the camelCase body Mealie expects and returns the slug", async () => {
    const post = vi.fn().mockResolvedValue("blech-pizza");
    const client = clientStub({ post });

    await expect(importRecipeFromUrl(client, "https://example.org/r", true)).resolves.toBe("blech-pizza");
    expect(post).toHaveBeenCalledWith("/api/recipes/create/url", {
      url: "https://example.org/r",
      includeTags: true,
      includeCategories: false,
    });
  });
});

describe("getRecipe", () => {
  it("fetches by slug", async () => {
    const get = vi.fn().mockResolvedValue({ id: "1", slug: "blech-pizza" });
    const client = clientStub({ get });

    await expect(getRecipe(client, "blech-pizza")).resolves.toMatchObject({ slug: "blech-pizza" });
    expect(get).toHaveBeenCalledWith("/api/recipes/blech-pizza");
  });
});
```

- [ ] **Step 2: Test laufen lassen und Fehlschlag bestätigen**

Run: `npx vitest run src/api/recipes.test.ts`
Expected: FAIL, `Failed to resolve import "./recipes"`

- [ ] **Step 3: `src/api/recipes.ts` implementieren**

```ts
import type { MealieClient, PaginatedResponse } from "./client";
import type { RecipeSummary } from "../types";

export async function searchRecipes(client: MealieClient, search: string, perPage = 50): Promise<RecipeSummary[]> {
  const term = search.trim();
  const response = await client.get<PaginatedResponse<RecipeSummary>>("/api/recipes", {
    search: term === "" ? undefined : term,
    page: 1,
    perPage,
  });
  return response?.items ?? [];
}

/**
 * Mealie antwortet auf diesen Endpunkt mit dem reinen Slug als String,
 * nicht mit dem Rezept-Objekt. Verifiziert gegen die OpenAPI-Spec am 2026-09-01.
 */
export function importRecipeFromUrl(client: MealieClient, url: string, includeTags: boolean): Promise<string> {
  return client.post<string>("/api/recipes/create/url", {
    url: url.trim(),
    includeTags,
    includeCategories: false,
  });
}

export function getRecipe(client: MealieClient, slug: string): Promise<RecipeSummary> {
  return client.get<RecipeSummary>("/api/recipes/" + slug);
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run`
Expected: PASS, alle bisherigen Tests grün.

- [ ] **Step 5: Commit**

```bash
git add src/api/recipes.ts src/api/recipes.test.ts
git commit -m "feat: Rezept-API mit Suche, Import und Einzelabruf"
```

---

### Task 5: Erster lauffähiger Command "Search Recipes"

Ab hier ist die Extension zum ersten Mal in Raycast benutzbar. Bewusst früh, damit alles Folgende gegen etwas Laufendes gebaut wird.

**Files:**
- Create: `src/hooks/useMealie.ts`, `src/components/ConfigErrorView.tsx`, `src/search-recipes.tsx`

**Interfaces:**
- Consumes: `getMealieConfig()`, `createMealieClient()`, `searchRecipes()`, `getSelf()`, `recipeWebUrl()`, `recipeImageUrl()`
- Produces:
  - `useMealie(): { client?: MealieClient; config?: MealieConfig; configError?: Error }`
  - `useGroupSlug(client?: MealieClient): string | undefined`
  - `<ConfigErrorView error={Error} />`

**Wichtig zu `useCachedPromise`:** Die Abhängigkeiten werden für den Cache-Key serialisiert. Ein `MealieClient` enthält Funktionen und darf deshalb **niemals** im Dependency-Array stehen. Der Client wird per Closure benutzt, das Array enthält nur primitive Werte.

- [ ] **Step 1: `src/hooks/useMealie.ts` anlegen**

```ts
import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { createMealieClient, type MealieClient, type MealieConfig } from "../api/client";
import { getSelf } from "../api/meta";
import { getMealieConfig } from "../preferences";

interface UseMealieResult {
  client?: MealieClient;
  config?: MealieConfig;
  configError?: Error;
}

export function useMealie(): UseMealieResult {
  return useMemo(() => {
    try {
      const config = getMealieConfig();
      return { config, client: createMealieClient(config) };
    } catch (error) {
      return { configError: error as Error };
    }
  }, []);
}

/**
 * Der groupSlug steckt in der Rezept-Web-URL. Er wird aus /api/users/self gelesen
 * und gecacht, statt geraten zu werden.
 */
export function useGroupSlug(client?: MealieClient): string | undefined {
  const { data } = useCachedPromise(async () => (await getSelf(client!)).groupSlug, [], {
    execute: client !== undefined,
  });
  return data;
}
```

- [ ] **Step 2: `src/components/ConfigErrorView.tsx` anlegen**

```tsx
import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

export function ConfigErrorView({ error }: { error: Error }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Gear}
        title="Mealie is not configured yet"
        description={error.message}
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

- [ ] **Step 3: `src/search-recipes.tsx` anlegen**

```tsx
import { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { ConfigErrorView } from "./components/ConfigErrorView";
import { useGroupSlug, useMealie } from "./hooks/useMealie";
import { searchRecipes } from "./api/recipes";
import { recipeImageUrl, recipeWebUrl } from "./lib/urls";
import type { RecipeSummary } from "./types";

export default function SearchRecipes() {
  const { client, config, configError } = useMealie();
  const [searchText, setSearchText] = useState("");
  const groupSlug = useGroupSlug(client);

  const { data, isLoading } = useCachedPromise((term: string) => searchRecipes(client!, term), [searchText], {
    execute: client !== undefined,
    keepPreviousData: true,
    initialData: [] as RecipeSummary[],
    onError: (error) => {
      showFailureToast(error, { title: "Could not load recipes" });
    },
  });

  if (configError) return <ConfigErrorView error={configError} />;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your Mealie recipes"
      throttle
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={searchText ? "No recipes found" : "Start typing to search"}
      />
      {data.map((recipe) => (
        <List.Item
          key={recipe.id}
          icon={{ source: recipeImageUrl(config!.baseUrl, recipe) ?? Icon.Book, fallback: Icon.Book }}
          title={recipe.name}
          subtitle={recipe.description ?? undefined}
          accessories={buildAccessories(recipe)}
          actions={
            <ActionPanel>
              {groupSlug && (
                <Action.OpenInBrowser
                  title="Open in Mealie"
                  url={recipeWebUrl(config!.baseUrl, groupSlug, recipe.slug)}
                />
              )}
              {recipe.orgURL && <Action.OpenInBrowser title="Open Original Source" url={recipe.orgURL} />}
              {groupSlug && (
                <Action.CopyToClipboard
                  title="Copy Mealie Link"
                  content={recipeWebUrl(config!.baseUrl, groupSlug, recipe.slug)}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function buildAccessories(recipe: RecipeSummary): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (recipe.totalTime) accessories.push({ icon: Icon.Clock, text: recipe.totalTime });
  const tag = recipe.tags?.[0] ?? recipe.recipeCategory?.[0];
  if (tag) accessories.push({ tag: tag.name });
  return accessories;
}
```

- [ ] **Step 4: Typprüfung und Lint**

Run: `npx tsc --noEmit`
Expected: Keine Fehler.

Run: `npm run lint`
Expected: Keine Fehler.

- [ ] **Step 5: Manuell in Raycast verifizieren**

Run: `npm run dev`

Dann in Raycast:
1. Beim ersten Start Mealie-URL und API-Token eintragen.
2. `Search Recipes` öffnen, einen Begriff tippen, der ein bekanntes Rezept trifft.
3. Enter drücken.

Expected: Der Browser öffnet `<mealieUrl>/g/<groupSlug>/r/<slug>` und die Rezeptseite lädt.

Falls 401 erscheint: Token prüfen. Falls die Seite 404 liefert: `groupSlug` in der URL gegen die Adresszeile in Mealie vergleichen und melden, statt den Pfad zu raten.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useMealie.ts src/components/ConfigErrorView.tsx src/search-recipes.tsx
git commit -m "feat: Command Search Recipes mit Enter auf die Mealie-Rezeptseite"
```

---

### Task 6: Food-API und Filterlogik für die Auto-Completion

Die 609 Foods werden einmal komplett geladen und clientseitig gefiltert. Grund laut Spec 3.3: Mealies eigene Suche ist token-basiert und findet "Basmatireis" nicht bei der Eingabe "Reis".

**Files:**
- Create: `src/api/foods.ts`, `src/lib/foodSearch.ts`
- Test: `src/lib/foodSearch.test.ts`

**Interfaces:**
- Consumes: `MealieClient`; `IngredientFood` aus `src/types.ts`
- Produces:
  - `getAllFoods(client: MealieClient): Promise<IngredientFood[]>`
  - `normalizeForSearch(value: string): string`
  - `filterFoods(foods: IngredientFood[], term: string, limit?: number): IngredientFood[]`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`src/lib/foodSearch.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterFoods, normalizeForSearch } from "./foodSearch";
import type { IngredientFood } from "../types";

function food(name: string, id = name): IngredientFood {
  return { id, name, pluralName: null, labelId: null, label: null };
}

describe("normalizeForSearch", () => {
  it("lowercases and strips diacritics so umlauts match either way", () => {
    expect(normalizeForSearch("Gemüse")).toBe("gemuse");
    expect(normalizeForSearch("KÄSE")).toBe("kase");
    expect(normalizeForSearch("  Öl  ")).toBe("ol");
  });
});

describe("filterFoods", () => {
  const foods = [food("Basmatireis"), food("Reis"), food("Milchreis"), food("Käse"), food("Kartoffeln")];

  it("matches anywhere in the name, which Mealie's token search does not", () => {
    const names = filterFoods(foods, "reis").map((f) => f.name);
    expect(names).toContain("Basmatireis");
    expect(names).toContain("Milchreis");
    expect(names).toContain("Reis");
  });

  it("ranks a prefix match above a match in the middle", () => {
    const names = filterFoods(foods, "reis").map((f) => f.name);
    expect(names[0]).toBe("Reis");
  });

  it("ignores case and umlauts", () => {
    expect(filterFoods(foods, "kase").map((f) => f.name)).toEqual(["Käse"]);
    expect(filterFoods(foods, "KÄSE").map((f) => f.name)).toEqual(["Käse"]);
  });

  it("returns everything up to the limit for an empty term", () => {
    expect(filterFoods(foods, "   ", 3)).toHaveLength(3);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterFoods(foods, "zzz")).toEqual([]);
  });
});
```

- [ ] **Step 2: Test laufen lassen und Fehlschlag bestätigen**

Run: `npx vitest run src/lib/foodSearch.test.ts`
Expected: FAIL, `Failed to resolve import "./foodSearch"`

- [ ] **Step 3: `src/lib/foodSearch.ts` implementieren**

```ts
import type { IngredientFood } from "../types";

export function normalizeForSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Substring-Match statt Token-Match, damit "reis" auch "Basmatireis" findet.
 * Treffer am Wortanfang werden vor Treffern in der Wortmitte einsortiert.
 */
export function filterFoods(foods: IngredientFood[], term: string, limit = 100): IngredientFood[] {
  const needle = normalizeForSearch(term);
  if (!needle) return foods.slice(0, limit);

  const scored: { food: IngredientFood; score: number }[] = [];
  for (const food of foods) {
    const index = normalizeForSearch(food.name).indexOf(needle);
    if (index === -1) continue;
    scored.push({ food, score: index });
  }

  scored.sort((a, b) => a.score - b.score || a.food.name.localeCompare(b.food.name, "de"));
  return scored.slice(0, limit).map((entry) => entry.food);
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/lib/foodSearch.test.ts`
Expected: PASS, 6 Tests grün.

- [ ] **Step 5: `src/api/foods.ts` implementieren**

```ts
import type { MealieClient } from "./client";
import type { IngredientFood } from "../types";

/**
 * Holt alle Foods des Haushalts. In der Referenzinstanz sind das 609 Einträge,
 * die bei perPage=200 in vier Requests geladen sind. Das Ergebnis wird vom
 * aufrufenden Hook gecacht.
 */
export function getAllFoods(client: MealieClient): Promise<IngredientFood[]> {
  return client.getAllPages<IngredientFood>("/api/foods", undefined, 200);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/api/foods.ts src/lib/foodSearch.ts src/lib/foodSearch.test.ts
git commit -m "feat: Food-API und Substring-Filter für die Auto-Completion"
```

---

### Task 7: Einkaufslisten-API und Label-Gruppierung

Hier steckt der wichtigste Fallstrick des Projekts: `ShoppingListItemUpdate` hat Defaults auf allen Feldern. Ein PUT mit nur `{ checked: true }` setzt `quantity` auf 1 und leert `note`. Deshalb `toItemUpdatePayload()`.

**Files:**
- Create: `src/api/shopping.ts`, `src/lib/shoppingGroups.ts`
- Test: `src/api/shopping.test.ts`, `src/lib/shoppingGroups.test.ts`

**Interfaces:**
- Consumes: `MealieClient`, `PaginatedResponse`; `ShoppingList`, `ShoppingListDetail`, `ShoppingListItem`, `LabelSetting` aus `src/types.ts`
- Produces:
  - `getShoppingLists(client): Promise<ShoppingList[]>`
  - `getShoppingList(client, listId): Promise<ShoppingListDetail>`: liefert Items **und** labelSettings in einem Request
  - `createShoppingList(client, name): Promise<ShoppingList>`
  - `renameShoppingList(client, list, name): Promise<ShoppingList>`
  - `deleteShoppingList(client, listId): Promise<void>`
  - `addFoodItem(client, listId, food, quantity?): Promise<ShoppingListItem>`
  - `addNoteItem(client, listId, note, quantity?): Promise<ShoppingListItem>`
  - `toItemUpdatePayload(item, changes): Record<string, unknown>`
  - `updateItem(client, item, changes): Promise<ShoppingListItem>`
  - `deleteItem(client, itemId): Promise<void>`
  - `addRecipeToList(client, listId, recipeId): Promise<void>`
  - `groupItemsByLabel(items, labelSettings): ItemGroup[]`
  - `interface ItemGroup { key: string; name: string; items: ShoppingListItem[] }`

- [ ] **Step 1: Den fehlschlagenden Test für die Gruppierung schreiben**

`src/lib/shoppingGroups.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { groupItemsByLabel } from "./shoppingGroups";
import type { LabelSetting, ShoppingListItem } from "../types";

const OBST = { id: "l-obst", name: "Obst und Gemüse", color: "#81E36A" };
const TK = { id: "l-tk", name: "Tiefkühlware", color: "#1525E7" };

const labelSettings: LabelSetting[] = [
  { labelId: TK.id, position: 0, label: TK },
  { labelId: OBST.id, position: 1, label: OBST },
];

function item(id: string, label: { id: string; name: string; color: string } | null): ShoppingListItem {
  return {
    id,
    shoppingListId: "list-1",
    checked: false,
    position: 0,
    quantity: 1,
    note: "",
    display: id,
    foodId: null,
    food: null,
    labelId: label?.id ?? null,
    label,
    unitId: null,
    unit: null,
  };
}

describe("groupItemsByLabel", () => {
  it("orders groups by the position the user configured, not alphabetically", () => {
    const groups = groupItemsByLabel([item("a", OBST), item("b", TK)], labelSettings);
    expect(groups.map((g) => g.name)).toEqual(["Tiefkühlware", "Obst und Gemüse"]);
  });

  it("puts items without a label into a trailing group", () => {
    const groups = groupItemsByLabel([item("a", null), item("b", TK)], labelSettings);
    expect(groups.map((g) => g.name)).toEqual(["Tiefkühlware", "No Label"]);
  });

  it("omits groups that have no items", () => {
    const groups = groupItemsByLabel([item("a", TK)], labelSettings);
    expect(groups).toHaveLength(1);
  });

  it("keeps items whose label is missing from labelSettings", () => {
    const other = { id: "l-other", name: "Asia", color: "#870208" };
    const groups = groupItemsByLabel([item("a", other)], labelSettings);
    expect(groups.map((g) => g.name)).toEqual(["Asia"]);
  });

  it("returns an empty array for no items", () => {
    expect(groupItemsByLabel([], labelSettings)).toEqual([]);
  });
});
```

- [ ] **Step 2: Test laufen lassen und Fehlschlag bestätigen**

Run: `npx vitest run src/lib/shoppingGroups.test.ts`
Expected: FAIL, `Failed to resolve import "./shoppingGroups"`

- [ ] **Step 3: `src/lib/shoppingGroups.ts` implementieren**

```ts
import type { LabelSetting, ShoppingListItem } from "../types";

export interface ItemGroup {
  key: string;
  name: string;
  items: ShoppingListItem[];
}

const NO_LABEL_KEY = "__no_label__";

/**
 * Gruppiert nach Label und sortiert die Gruppen nach `labelSettings.position`.
 * Das ist die vom Nutzer in Mealie festgelegte Ladenlauf-Reihenfolge, nicht
 * alphabetisch. Labels, die nicht in labelSettings stehen, landen hinter den
 * konfigurierten und vor der Gruppe ohne Label.
 */
export function groupItemsByLabel(items: ShoppingListItem[], labelSettings: LabelSetting[]): ItemGroup[] {
  const positions = new Map(labelSettings.map((setting) => [setting.labelId, setting.position]));
  const buckets = new Map<string, ItemGroup>();

  for (const item of items) {
    const key = item.label?.id ?? NO_LABEL_KEY;
    const name = item.label?.name ?? "No Label";
    const bucket = buckets.get(key) ?? { key, name, items: [] };
    bucket.items.push(item);
    buckets.set(key, bucket);
  }

  const fallback = labelSettings.length + 1;
  return [...buckets.values()].sort((a, b) => {
    const pa = a.key === NO_LABEL_KEY ? Number.MAX_SAFE_INTEGER : (positions.get(a.key) ?? fallback);
    const pb = b.key === NO_LABEL_KEY ? Number.MAX_SAFE_INTEGER : (positions.get(b.key) ?? fallback);
    return pa - pb || a.name.localeCompare(b.name, "de");
  });
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/lib/shoppingGroups.test.ts`
Expected: PASS, 5 Tests grün.

- [ ] **Step 5: Den fehlschlagenden Test für `toItemUpdatePayload` schreiben**

`src/api/shopping.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { addFoodItem, addNoteItem, toItemUpdatePayload, updateItem } from "./shopping";
import type { MealieClient } from "./client";
import type { IngredientFood, ShoppingListItem } from "../types";

function clientStub(overrides: Partial<MealieClient>): MealieClient {
  return { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn(), getAllPages: vi.fn(), ...overrides } as MealieClient;
}

const existing: ShoppingListItem = {
  id: "item-1",
  shoppingListId: "list-1",
  checked: false,
  position: 7,
  quantity: 3,
  note: "aus dem Bioladen",
  display: "3 Äpfel",
  foodId: "food-1",
  food: null,
  labelId: "label-1",
  label: null,
  unitId: "unit-1",
  unit: null,
};

describe("toItemUpdatePayload", () => {
  it("keeps every field so Mealie's defaults cannot wipe them", () => {
    const payload = toItemUpdatePayload(existing, { checked: true });

    expect(payload).toEqual({
      shoppingListId: "list-1",
      checked: true,
      position: 7,
      quantity: 3,
      note: "aus dem Bioladen",
      foodId: "food-1",
      labelId: "label-1",
      unitId: "unit-1",
    });
  });

  it("does not send the nested food, unit or label objects back", () => {
    const payload = toItemUpdatePayload(existing, {});
    expect(payload).not.toHaveProperty("food");
    expect(payload).not.toHaveProperty("unit");
    expect(payload).not.toHaveProperty("label");
    expect(payload).not.toHaveProperty("display");
  });
});

describe("updateItem", () => {
  it("PUTs to the single item endpoint", async () => {
    const put = vi.fn().mockResolvedValue({ ...existing, checked: true });
    await updateItem(clientStub({ put }), existing, { checked: true });
    expect(put).toHaveBeenCalledWith("/api/households/shopping/items/item-1", expect.objectContaining({ checked: true }));
  });
});

describe("addFoodItem", () => {
  it("carries the food's label so the item lands in the right aisle", async () => {
    const post = vi.fn().mockResolvedValue({ id: "new" });
    const food: IngredientFood = {
      id: "food-9",
      name: "Thymian",
      pluralName: null,
      labelId: "label-veg",
      label: { id: "label-veg", name: "Obst und Gemüse", color: "#81E36A" },
    };

    await addFoodItem(clientStub({ post }), "list-1", food);

    expect(post).toHaveBeenCalledWith("/api/households/shopping/items", {
      shoppingListId: "list-1",
      foodId: "food-9",
      labelId: "label-veg",
      quantity: 1,
      note: "",
      checked: false,
    });
  });

  it("sends a null label when the food has none", async () => {
    const post = vi.fn().mockResolvedValue({ id: "new" });
    const food: IngredientFood = { id: "f", name: "Käse", pluralName: null, labelId: null, label: null };

    await addFoodItem(clientStub({ post }), "list-1", food);

    expect(post).toHaveBeenCalledWith("/api/households/shopping/items", expect.objectContaining({ labelId: null }));
  });
});

describe("addNoteItem", () => {
  it("creates a free text item without a food reference", async () => {
    const post = vi.fn().mockResolvedValue({ id: "new" });
    await addNoteItem(clientStub({ post }), "list-1", "Cheddar", 2);

    expect(post).toHaveBeenCalledWith("/api/households/shopping/items", {
      shoppingListId: "list-1",
      foodId: null,
      labelId: null,
      quantity: 2,
      note: "Cheddar",
      checked: false,
    });
  });
});
```

- [ ] **Step 6: Test laufen lassen und Fehlschlag bestätigen**

Run: `npx vitest run src/api/shopping.test.ts`
Expected: FAIL, `Failed to resolve import "./shopping"`

- [ ] **Step 7: `src/api/shopping.ts` implementieren**

```ts
import type { MealieClient, PaginatedResponse } from "./client";
import type { IngredientFood, ShoppingList, ShoppingListDetail, ShoppingListItem } from "../types";

const LISTS = "/api/households/shopping/lists";
const ITEMS = "/api/households/shopping/items";

export async function getShoppingLists(client: MealieClient): Promise<ShoppingList[]> {
  const response = await client.get<PaginatedResponse<ShoppingList>>(LISTS, { page: 1, perPage: 100 });
  return response?.items ?? [];
}

/** Liefert Items und labelSettings in einem Request. Der Items-Endpunkt kann nicht nach Liste filtern. */
export function getShoppingList(client: MealieClient, listId: string): Promise<ShoppingListDetail> {
  return client.get<ShoppingListDetail>(LISTS + "/" + listId);
}

export function createShoppingList(client: MealieClient, name: string): Promise<ShoppingList> {
  return client.post<ShoppingList>(LISTS, { name: name.trim() });
}

export function renameShoppingList(client: MealieClient, list: ShoppingList, name: string): Promise<ShoppingList> {
  return client.put<ShoppingList>(LISTS + "/" + list.id, { name: name.trim() });
}

export function deleteShoppingList(client: MealieClient, listId: string): Promise<void> {
  return client.del(LISTS + "/" + listId);
}

export function addFoodItem(
  client: MealieClient,
  listId: string,
  food: IngredientFood,
  quantity = 1,
): Promise<ShoppingListItem> {
  return client.post<ShoppingListItem>(ITEMS, {
    shoppingListId: listId,
    foodId: food.id,
    // Explizit mitgeben. Ob Mealie das Label serverseitig aus dem Food ableitet,
    // ist nicht verifiziert; so ist es in beiden Fällen korrekt.
    labelId: food.labelId,
    quantity,
    note: "",
    checked: false,
  });
}

export function addNoteItem(
  client: MealieClient,
  listId: string,
  note: string,
  quantity = 1,
): Promise<ShoppingListItem> {
  return client.post<ShoppingListItem>(ITEMS, {
    shoppingListId: listId,
    foodId: null,
    labelId: null,
    quantity,
    note: note.trim(),
    checked: false,
  });
}

export interface ItemChanges {
  checked?: boolean;
  quantity?: number;
  note?: string;
  labelId?: string | null;
  unitId?: string | null;
  position?: number;
}

/**
 * ShoppingListItemUpdate hat Defaults auf allen Feldern (quantity=1, note="",
 * checked=false, position=0). Ein Teilobjekt würde vorhandene Werte
 * überschreiben, deshalb wird immer das vollständige Item gesendet.
 * Die verschachtelten food/unit/label-Objekte gehören nicht in den Payload.
 */
export function toItemUpdatePayload(item: ShoppingListItem, changes: ItemChanges): Record<string, unknown> {
  return {
    shoppingListId: item.shoppingListId,
    checked: changes.checked ?? item.checked,
    position: changes.position ?? item.position,
    quantity: changes.quantity ?? item.quantity,
    note: changes.note ?? item.note ?? "",
    foodId: item.foodId,
    labelId: changes.labelId !== undefined ? changes.labelId : item.labelId,
    unitId: changes.unitId !== undefined ? changes.unitId : item.unitId,
  };
}

export function updateItem(
  client: MealieClient,
  item: ShoppingListItem,
  changes: ItemChanges,
): Promise<ShoppingListItem> {
  return client.put<ShoppingListItem>(ITEMS + "/" + item.id, toItemUpdatePayload(item, changes));
}

export function deleteItem(client: MealieClient, itemId: string): Promise<void> {
  return client.del(ITEMS + "/" + itemId);
}

export async function addRecipeToList(client: MealieClient, listId: string, recipeId: string): Promise<void> {
  await client.post(LISTS + "/" + listId + "/recipe/" + recipeId, {});
}
```

- [ ] **Step 8: Tests laufen lassen**

Run: `npx vitest run`
Expected: PASS, alle Tests grün.

- [ ] **Step 9: Commit**

```bash
git add src/api/shopping.ts src/api/shopping.test.ts src/lib/shoppingGroups.ts src/lib/shoppingGroups.test.ts
git commit -m "feat: Einkaufslisten-API mit vollständigem Update-Payload und Label-Gruppierung"
```

---

### Task 8: Command "Add to Shopping List" mit Food-Auto-Completion

Der Schnellweg und der Kern der Anforderung. Bewusst eine `List` statt eines `Form.Dropdown`, weil dadurch Auto-Completion und Freitext im selben Flow möglich sind.

**Files:**
- Create: `src/hooks/useFoods.ts`, `src/components/FoodPicker.tsx`, `src/add-to-shopping-list.tsx`

**Interfaces:**
- Consumes: `useMealie()`, `getAllFoods()`, `filterFoods()`, `getShoppingLists()`, `addFoodItem()`, `addNoteItem()`
- Produces:
  - `useFoods(client?): { foods: IngredientFood[]; isLoading: boolean; revalidate: () => void }`
  - `<FoodPicker client listId listName onAdded? />`

- [ ] **Step 1: `src/hooks/useFoods.ts` anlegen**

```ts
import { useCachedPromise } from "@raycast/utils";
import { getAllFoods } from "../api/foods";
import type { MealieClient } from "../api/client";
import type { IngredientFood } from "../types";

/**
 * Lädt alle Foods einmal und cacht sie. Gefiltert wird clientseitig, weil
 * Mealies Suche token-basiert ist und "Basmatireis" nicht bei "Reis" findet.
 */
export function useFoods(client?: MealieClient) {
  const { data, isLoading, revalidate } = useCachedPromise(() => getAllFoods(client!), [], {
    execute: client !== undefined,
    initialData: [] as IngredientFood[],
    keepPreviousData: true,
  });
  return { foods: data, isLoading, revalidate };
}
```

- [ ] **Step 2: `src/components/FoodPicker.tsx` anlegen**

```tsx
import { useMemo, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { addFoodItem, addNoteItem } from "../api/shopping";
import { filterFoods } from "../lib/foodSearch";
import { useFoods } from "../hooks/useFoods";
import type { MealieClient } from "../api/client";
import type { IngredientFood } from "../types";

interface FoodPickerProps {
  client: MealieClient;
  listId: string;
  listName: string;
  onAdded?: () => void;
}

export function FoodPicker({ client, listId, listName, onAdded }: FoodPickerProps) {
  const { foods, isLoading } = useFoods(client);
  const [searchText, setSearchText] = useState("");

  const matches = useMemo(() => filterFoods(foods, searchText, 60), [foods, searchText]);
  const trimmed = searchText.trim();
  const hasExactMatch = matches.some((food) => food.name.toLowerCase() === trimmed.toLowerCase());

  async function add(action: () => Promise<unknown>, label: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding " + label });
    try {
      await action();
      toast.style = Toast.Style.Success;
      toast.title = "Added " + label;
      toast.message = "to " + listName;
      setSearchText("");
      onAdded?.();
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could not add " + label });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={"Add to " + listName}
      filtering={false}
    >
      <List.Section title="Your Foods" subtitle={String(matches.length)}>
        {matches.map((food) => (
          <List.Item
            key={food.id}
            icon={food.label ? { source: Icon.Dot, tintColor: food.label.color } : Icon.Circle}
            title={food.name}
            accessories={labelAccessory(food)}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Plus}
                  title={"Add to " + listName}
                  onAction={() => add(() => addFoodItem(client, listId, food), food.name)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {trimmed && !hasExactMatch && (
        <List.Section title="Not in your foods yet">
          <List.Item
            icon={Icon.Pencil}
            title={'Add "' + trimmed + '" as free text'}
            subtitle="No label, will show under No Label"
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Plus}
                  title={"Add to " + listName}
                  onAction={() => add(() => addNoteItem(client, listId, trimmed), trimmed)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function labelAccessory(food: IngredientFood): List.Item.Accessory[] {
  if (food.label) return [{ tag: { value: food.label.name, color: food.label.color } }];
  return [{ tag: { value: "No label", color: Color.SecondaryText } }];
}
```

- [ ] **Step 3: `src/add-to-shopping-list.tsx` anlegen**

Merkt sich die zuletzt benutzte Liste in `LocalStorage` und springt bei nur einer Liste direkt in den FoodPicker.

```tsx
import { Action, ActionPanel, Icon, LocalStorage, List, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { ConfigErrorView } from "./components/ConfigErrorView";
import { FoodPicker } from "./components/FoodPicker";
import { useMealie } from "./hooks/useMealie";
import { getShoppingLists } from "./api/shopping";
import type { ShoppingList } from "./types";

const LAST_LIST_KEY = "mealie.lastShoppingListId";

export default function AddToShoppingList() {
  const { client, configError } = useMealie();
  const { push } = useNavigation();

  const { data: lists, isLoading } = useCachedPromise(() => getShoppingLists(client!), [], {
    execute: client !== undefined,
    initialData: [] as ShoppingList[],
    onError: (error) => {
      showFailureToast(error, { title: "Could not load shopping lists" });
    },
  });

  const { data: lastListId } = useCachedPromise(async () => (await LocalStorage.getItem<string>(LAST_LIST_KEY)) ?? "");

  if (configError) return <ConfigErrorView error={configError} />;

  async function open(list: ShoppingList) {
    await LocalStorage.setItem(LAST_LIST_KEY, list.id);
    push(<FoodPicker client={client!} listId={list.id} listName={list.name} />);
  }

  const ordered = [...lists].sort((a, b) => {
    if (a.id === lastListId) return -1;
    if (b.id === lastListId) return 1;
    return a.name.localeCompare(b.name, "de");
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Pick a shopping list">
      <List.EmptyView icon={Icon.Cart} title="No shopping lists found" />
      {ordered.map((list) => (
        <List.Item
          key={list.id}
          icon={Icon.Cart}
          title={list.name}
          accessories={list.id === lastListId ? [{ tag: "Last used" }] : undefined}
          actions={
            <ActionPanel>
              <Action icon={Icon.Plus} title="Add Item to This List" onAction={() => open(list)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

- [ ] **Step 4: Typprüfung und Lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: Keine Fehler.

- [ ] **Step 5: Manuell verifizieren**

Run: `npm run dev`

1. `Add to Shopping List` öffnen, eine Liste wählen.
2. `reis` tippen. Expected: Es erscheinen auch Foods, die "reis" in der Mitte tragen, jeweils mit farbigem Label-Tag.
3. Ein Food mit Label per Enter hinzufügen.
4. In Mealie prüfen: Das Item steht in der richtigen Kategorie.
5. Einen Fantasiebegriff tippen und den Freitext-Eintrag benutzen. Expected: Item erscheint in Mealie ohne Label.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useFoods.ts src/components/FoodPicker.tsx src/add-to-shopping-list.tsx
git commit -m "feat: Command Add to Shopping List mit Food-Auto-Completion und Freitext"
```

---

### Task 9: Command "Shopping Lists" mit vollem CRUD

**Files:**
- Create: `src/shopping-lists.tsx`, `src/components/ShoppingListItems.tsx`, `src/components/NameForm.tsx`, `src/components/ItemForm.tsx`, `src/api/units.ts`

**Interfaces:**
- Consumes: alles aus `src/api/shopping.ts`, `groupItemsByLabel()`, `<FoodPicker />`, `shoppingListWebUrl()`
- Produces: nichts, was spätere Tasks brauchen

- [ ] **Step 1: `src/components/NameForm.tsx` anlegen**

Ein wiederverwendbares Ein-Feld-Formular für Anlegen und Umbenennen.

```tsx
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";

interface NameFormProps {
  title: string;
  submitTitle: string;
  initialValue?: string;
  onSubmit: (name: string) => Promise<void>;
}

export function NameForm({ title, submitTitle, initialValue = "", onSubmit }: NameFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitTitle}
            onSubmit={async (values: { name: string }) => {
              if (!values.name.trim()) return;
              await onSubmit(values.name.trim());
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={initialValue} autoFocus />
    </Form>
  );
}
```

- [ ] **Step 2: `src/components/ShoppingListItems.tsx` anlegen**

Abhaken und Löschen laufen als Optimistic Update, weil das im Supermarkt bei schlechtem Netz passiert.

```tsx
import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { FoodPicker } from "./FoodPicker";
import { deleteItem, getShoppingList, updateItem } from "../api/shopping";
import { groupItemsByLabel } from "../lib/shoppingGroups";
import type { MealieClient } from "../api/client";
import type { ShoppingListDetail, ShoppingListItem } from "../types";

interface Props {
  client: MealieClient;
  listId: string;
  listName: string;
}

export function ShoppingListItems({ client, listId, listName }: Props) {
  const { push } = useNavigation();

  const { data, isLoading, mutate, revalidate } = useCachedPromise(
    (id: string) => getShoppingList(client, id),
    [listId],
    {
      onError: (error) => {
        showFailureToast(error, { title: "Could not load the list" });
      },
    },
  );

  const open = (data?.listItems ?? []).filter((item) => !item.checked);
  const done = (data?.listItems ?? []).filter((item) => item.checked);
  const groups = groupItemsByLabel(open, data?.labelSettings ?? []);

  async function toggle(item: ShoppingListItem) {
    try {
      await mutate(updateItem(client, item, { checked: !item.checked }), {
        optimisticUpdate(current?: ShoppingListDetail) {
          if (!current) return current;
          return {
            ...current,
            listItems: current.listItems.map((entry) =>
              entry.id === item.id ? { ...entry, checked: !item.checked } : entry,
            ),
          };
        },
        shouldRevalidateAfter: true,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could not update the item" });
    }
  }

  async function remove(item: ShoppingListItem) {
    try {
      await mutate(deleteItem(client, item.id), {
        optimisticUpdate(current?: ShoppingListDetail) {
          if (!current) return current;
          return { ...current, listItems: current.listItems.filter((entry) => entry.id !== item.id) };
        },
        shouldRevalidateAfter: true,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could not delete the item" });
    }
  }

  async function clearChecked() {
    const confirmed = await confirmAlert({
      title: "Delete all checked items?",
      message: done.length + " items will be removed from " + listName + ".",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await Promise.all(done.map((item) => deleteItem(client, item.id)));
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Could not delete the checked items" });
    }
  }

  function itemActions(item: ShoppingListItem) {
    return (
      <ActionPanel>
        <Action
          icon={item.checked ? Icon.Circle : Icon.CheckCircle}
          title={item.checked ? "Mark as Open" : "Mark as Done"}
          onAction={() => toggle(item)}
        />
        <Action
          icon={Icon.Plus}
          title="Add Item"
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() =>
            push(<FoodPicker client={client} listId={listId} listName={listName} onAdded={revalidate} />)
          }
        />
        <Action
          icon={Icon.Trash}
          title="Delete Item"
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={() => remove(item)}
        />
        {done.length > 0 && (
          <Action
            icon={Icon.Trash}
            title="Delete All Checked Items"
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
            onAction={clearChecked}
          />
        )}
      </ActionPanel>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle={listName} searchBarPlaceholder={"Filter " + listName}>
      <List.EmptyView
        icon={Icon.Cart}
        title="This list is empty"
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Plus}
              title="Add Item"
              onAction={() =>
                push(<FoodPicker client={client} listId={listId} listName={listName} onAdded={revalidate} />)
              }
            />
          </ActionPanel>
        }
      />
      {groups.map((group) => (
        <List.Section key={group.key} title={group.name} subtitle={String(group.items.length)}>
          {group.items.map((item) => (
            <List.Item
              key={item.id}
              icon={{ source: Icon.Circle, tintColor: item.label?.color ?? Color.SecondaryText }}
              title={item.display || item.note || item.food?.name || "Item"}
              actions={itemActions(item)}
            />
          ))}
        </List.Section>
      ))}
      {done.length > 0 && (
        <List.Section title="Done" subtitle={String(done.length)}>
          {done.map((item) => (
            <List.Item
              key={item.id}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              title={item.display || item.note || item.food?.name || "Item"}
              actions={itemActions(item)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
```

- [ ] **Step 3: `src/shopping-lists.tsx` anlegen**

```tsx
import { Action, ActionPanel, Alert, Icon, List, confirmAlert, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { ConfigErrorView } from "./components/ConfigErrorView";
import { NameForm } from "./components/NameForm";
import { ShoppingListItems } from "./components/ShoppingListItems";
import { useGroupSlug, useMealie } from "./hooks/useMealie";
import { createShoppingList, deleteShoppingList, getShoppingLists, renameShoppingList } from "./api/shopping";
import { shoppingListWebUrl } from "./lib/urls";
import type { ShoppingList } from "./types";

export default function ShoppingLists() {
  const { client, config, configError } = useMealie();
  const { push } = useNavigation();
  const groupSlug = useGroupSlug(client);

  const { data, isLoading, revalidate } = useCachedPromise(() => getShoppingLists(client!), [], {
    execute: client !== undefined,
    initialData: [] as ShoppingList[],
    onError: (error) => {
      showFailureToast(error, { title: "Could not load shopping lists" });
    },
  });

  if (configError) return <ConfigErrorView error={configError} />;

  async function runAndRefresh(action: () => Promise<unknown>, failureTitle: string) {
    try {
      await action();
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: failureTitle });
    }
  }

  async function confirmDelete(list: ShoppingList) {
    const confirmed = await confirmAlert({
      title: "Delete " + list.name + "?",
      message: "This removes the list and all of its items in Mealie.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await runAndRefresh(() => deleteShoppingList(client!, list.id), "Could not delete the list");
    }
  }

  const newListAction = (
    <Action
      icon={Icon.Plus}
      title="New Shopping List"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() =>
        push(
          <NameForm
            title="New Shopping List"
            submitTitle="Create List"
            onSubmit={(name) => runAndRefresh(() => createShoppingList(client!, name), "Could not create the list")}
          />,
        )
      }
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter shopping lists">
      <List.EmptyView
        icon={Icon.Cart}
        title="No shopping lists yet"
        actions={<ActionPanel>{newListAction}</ActionPanel>}
      />
      {data.map((list) => (
        <List.Item
          key={list.id}
          icon={Icon.Cart}
          title={list.name}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.List}
                title="Open List"
                onAction={() => push(<ShoppingListItems client={client!} listId={list.id} listName={list.name} />)}
              />
              {newListAction}
              <Action
                icon={Icon.Pencil}
                title="Rename List"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() =>
                  push(
                    <NameForm
                      title="Rename Shopping List"
                      submitTitle="Rename"
                      initialValue={list.name}
                      onSubmit={(name) =>
                        runAndRefresh(() => renameShoppingList(client!, list, name), "Could not rename the list")
                      }
                    />,
                  )
                }
              />
              {groupSlug && (
                <Action.OpenInBrowser
                  title="Open in Mealie"
                  url={shoppingListWebUrl(config!.baseUrl, groupSlug, list.id)}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              )}
              <Action
                icon={Icon.Trash}
                title="Delete List"
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => confirmDelete(list)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

- [ ] **Step 4: Item-Bearbeitung ergänzen**

Spec 4.2 verlangt, dass Menge, Einheit, Notiz und Label eines Items änderbar sind.
`updateItem()` aus Task 7 kann das bereits, es fehlt nur die Oberfläche.

Zuerst `src/api/units.ts` anlegen:

```ts
import type { MealieClient } from "./client";
import type { IngredientUnit } from "../types";

export function getAllUnits(client: MealieClient): Promise<IngredientUnit[]> {
  return client.getAllPages<IngredientUnit>("/api/units", undefined, 200);
}
```

Dann `src/components/ItemForm.tsx`:

Die Label-Auswahl kommt aus den `labelSettings` der Liste, die ohnehin schon geladen sind.
Ein zusätzlicher Request an `/api/groups/labels` ist dafür nicht nötig.

```tsx
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getAllUnits } from "../api/units";
import type { MealieClient } from "../api/client";
import type { ItemChanges } from "../api/shopping";
import type { IngredientUnit, LabelSetting, ShoppingListItem } from "../types";

const NONE = "__none__";

interface Props {
  client: MealieClient;
  item: ShoppingListItem;
  labelSettings: LabelSetting[];
  onSubmit: (changes: ItemChanges) => Promise<void>;
}

export function ItemForm({ client, item, labelSettings, onSubmit }: Props) {
  const { pop } = useNavigation();
  const { data: units, isLoading } = useCachedPromise(() => getAllUnits(client), [], {
    initialData: [] as IngredientUnit[],
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Edit Item"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Item"
            onSubmit={async (values: { quantity: string; unitId: string; note: string; labelId: string }) => {
              const quantity = Number.parseFloat(values.quantity.replace(",", "."));
              await onSubmit({
                quantity: Number.isFinite(quantity) ? quantity : item.quantity,
                note: values.note,
                unitId: values.unitId === NONE ? null : values.unitId,
                labelId: values.labelId === NONE ? null : values.labelId,
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="quantity" title="Quantity" defaultValue={String(item.quantity ?? 0)} />
      <Form.Dropdown id="unitId" title="Unit" defaultValue={item.unitId ?? NONE}>
        <Form.Dropdown.Item value={NONE} title="No unit" />
        {units.map((unit) => (
          <Form.Dropdown.Item key={unit.id} value={unit.id} title={unit.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="note" title="Note" defaultValue={item.note ?? ""} />
      <Form.Dropdown id="labelId" title="Label" defaultValue={item.labelId ?? NONE}>
        <Form.Dropdown.Item value={NONE} title="No label" />
        {labelSettings.map((setting) => (
          <Form.Dropdown.Item key={setting.labelId} value={setting.labelId} title={setting.label.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
```

In `src/components/ShoppingListItems.tsx` den Import ergänzen:

```tsx
import { ItemForm } from "./ItemForm";
```

und in `itemActions()` hinter der `Add Item`-Action einfügen:

```tsx
<Action
  icon={Icon.Pencil}
  title="Edit Item"
  shortcut={{ modifiers: ["cmd"], key: "e" }}
  onAction={() =>
    push(
      <ItemForm
        client={client}
        item={item}
        labelSettings={data?.labelSettings ?? []}
        onSubmit={async (changes) => {
          try {
            await updateItem(client, item, changes);
            revalidate();
          } catch (error) {
            await showFailureToast(error, { title: "Could not save the item" });
          }
        }}
      />,
    )
  }
/>
```

- [ ] **Step 5: Typprüfung, Lint und manuelle Verifikation**

Run: `npx tsc --noEmit && npm run lint`
Expected: Keine Fehler.

Run: `npm run dev`, dann in Raycast:
1. `Shopping Lists` öffnen, eine Liste öffnen.
2. Expected: Sektionen stehen in derselben Reihenfolge wie in Mealie, nicht alphabetisch.
3. Ein Item mit Menge und Notiz abhaken. **Danach in Mealie prüfen: Menge und Notiz sind unverändert.** Das ist der Regressionstest für den Update-Fallstrick aus den Global Constraints.
4. Ein Item per `Cmd+E` bearbeiten: Menge auf 3 setzen, eine Einheit wählen, das Label wechseln. Expected: In Mealie stehen alle drei Änderungen, und das Item springt in die Sektion des neuen Labels.
5. Item löschen, Liste anlegen, umbenennen, löschen.

- [ ] **Step 6: Commit**

```bash
git add src/shopping-lists.tsx src/components/ShoppingListItems.tsx src/components/NameForm.tsx src/components/ItemForm.tsx src/api/units.ts
git commit -m "feat: Command Shopping Lists mit CRUD, Item-Bearbeitung und Optimistic Updates"
```

---

### Task 10: Essensplan-API, Wochenlogik und Command "Meal Plan"

**Files:**
- Create: `src/lib/week.ts`, `src/api/mealplan.ts`, `src/components/RecipePicker.tsx`, `src/meal-plan.tsx`
- Test: `src/lib/week.test.ts`

**Interfaces:**
- Consumes: `MealieClient`, `searchRecipes()`, `recipeWebUrl()`
- Produces:
  - `src/lib/week.ts`: `toIsoDate(date: Date): string`, `startOfWeek(date: Date): Date`, `addDays(date: Date, days: number): Date`, `weekDays(monday: Date): Date[]`, `formatDayLabel(date: Date): string`
  - `src/api/mealplan.ts`: `getMealPlan(client, startDate, endDate): Promise<MealPlanEntry[]>`, `createMealPlanEntry(client, input): Promise<MealPlanEntry>`, `updateMealPlanEntry(client, entry, changes): Promise<MealPlanEntry>`, `deleteMealPlanEntry(client, id: number): Promise<void>`
  - `<RecipePicker client onPick={(recipe) => void} />`

- [ ] **Step 1: Den fehlschlagenden Test für die Wochenlogik schreiben**

`src/lib/week.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addDays, startOfWeek, toIsoDate, weekDays } from "./week";

describe("toIsoDate", () => {
  it("formats in local time, not UTC, so late evenings do not shift a day", () => {
    expect(toIsoDate(new Date(2026, 8, 1, 23, 30))).toBe("2026-09-01");
    expect(toIsoDate(new Date(2026, 0, 5, 0, 15))).toBe("2026-01-05");
  });
});

describe("startOfWeek", () => {
  it("returns Monday for a Wednesday", () => {
    expect(toIsoDate(startOfWeek(new Date(2026, 8, 2)))).toBe("2026-08-31");
  });

  it("returns the same day for a Monday", () => {
    expect(toIsoDate(startOfWeek(new Date(2026, 7, 31)))).toBe("2026-08-31");
  });

  it("returns the previous Monday for a Sunday", () => {
    expect(toIsoDate(startOfWeek(new Date(2026, 8, 6)))).toBe("2026-08-31");
  });
});

describe("addDays", () => {
  it("crosses a month boundary", () => {
    expect(toIsoDate(addDays(new Date(2026, 7, 31), 7))).toBe("2026-09-07");
  });

  it("goes backwards", () => {
    expect(toIsoDate(addDays(new Date(2026, 8, 1), -1))).toBe("2026-08-31");
  });
});

describe("weekDays", () => {
  it("returns seven days starting at the given Monday", () => {
    const days = weekDays(new Date(2026, 7, 31)).map(toIsoDate);
    expect(days).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ]);
  });
});
```

- [ ] **Step 2: Test laufen lassen und Fehlschlag bestätigen**

Run: `npx vitest run src/lib/week.test.ts`
Expected: FAIL, `Failed to resolve import "./week"`

- [ ] **Step 3: `src/lib/week.ts` implementieren**

```ts
/** Formatiert in lokaler Zeit. toISOString() würde spätabends einen Tag zurückspringen. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() + "-" + month + "-" + day;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Montag als Wochenanfang. getDay() liefert 0 für Sonntag. */
export function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(date, offset);
}

export function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "long", day: "2-digit", month: "2-digit" });
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/lib/week.test.ts`
Expected: PASS, 8 Tests grün.

- [ ] **Step 5: `src/api/mealplan.ts` implementieren**

```ts
import type { MealieClient, PaginatedResponse } from "./client";
import type { MealPlanEntry, PlanEntryType } from "../types";

const PLANS = "/api/households/mealplans";

export async function getMealPlan(client: MealieClient, startDate: string, endDate: string): Promise<MealPlanEntry[]> {
  const response = await client.get<PaginatedResponse<MealPlanEntry>>(PLANS, {
    start_date: startDate,
    end_date: endDate,
    page: 1,
    perPage: 200,
  });
  return response?.items ?? [];
}

export interface MealPlanInput {
  date: string;
  entryType: PlanEntryType;
  recipeId?: string | null;
  title?: string;
}

export function createMealPlanEntry(client: MealieClient, input: MealPlanInput): Promise<MealPlanEntry> {
  return client.post<MealPlanEntry>(PLANS, {
    date: input.date,
    entryType: input.entryType,
    recipeId: input.recipeId ?? null,
    title: input.recipeId ? "" : (input.title ?? ""),
    text: "",
  });
}

export function updateMealPlanEntry(
  client: MealieClient,
  entry: MealPlanEntry,
  changes: Partial<MealPlanInput>,
): Promise<MealPlanEntry> {
  return client.put<MealPlanEntry>(PLANS + "/" + entry.id, {
    id: entry.id,
    date: changes.date ?? entry.date,
    entryType: changes.entryType ?? entry.entryType,
    recipeId: changes.recipeId !== undefined ? changes.recipeId : entry.recipeId,
    title: changes.title ?? entry.title ?? "",
    text: entry.text ?? "",
  });
}

export function deleteMealPlanEntry(client: MealieClient, id: number): Promise<void> {
  return client.del(PLANS + "/" + id);
}
```

- [ ] **Step 6: `src/components/RecipePicker.tsx` anlegen**

```tsx
import { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { searchRecipes } from "../api/recipes";
import type { MealieClient } from "../api/client";
import type { RecipeSummary } from "../types";

interface Props {
  client: MealieClient;
  navigationTitle: string;
  onPick: (recipe: RecipeSummary) => void;
  onPickFreeText?: (title: string) => void;
}

export function RecipePicker({ client, navigationTitle, onPick, onPickFreeText }: Props) {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useCachedPromise((term: string) => searchRecipes(client, term), [searchText], {
    keepPreviousData: true,
    initialData: [] as RecipeSummary[],
    onError: (error) => {
      showFailureToast(error, { title: "Could not load recipes" });
    },
  });

  const trimmed = searchText.trim();

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search a recipe"
      throttle
    >
      <List.Section title="Recipes">
        {data.map((recipe) => (
          <List.Item
            key={recipe.id}
            icon={Icon.Book}
            title={recipe.name}
            actions={
              <ActionPanel>
                <Action icon={Icon.Check} title="Choose Recipe" onAction={() => onPick(recipe)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {onPickFreeText && trimmed && (
        <List.Section title="Without a recipe">
          <List.Item
            icon={Icon.Pencil}
            title={'Use "' + trimmed + '" as a plain entry'}
            actions={
              <ActionPanel>
                <Action icon={Icon.Check} title="Use Free Text" onAction={() => onPickFreeText(trimmed)} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
```

- [ ] **Step 7: `src/meal-plan.tsx` anlegen**

```tsx
import { useState } from "react";
import { Action, ActionPanel, Alert, Icon, List, confirmAlert, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { ConfigErrorView } from "./components/ConfigErrorView";
import { RecipePicker } from "./components/RecipePicker";
import { useGroupSlug, useMealie } from "./hooks/useMealie";
import { createMealPlanEntry, deleteMealPlanEntry, getMealPlan, updateMealPlanEntry } from "./api/mealplan";
import { addDays, formatDayLabel, startOfWeek, toIsoDate, weekDays } from "./lib/week";
import { recipeWebUrl } from "./lib/urls";
import { PLAN_ENTRY_TYPES, type MealPlanEntry, type PlanEntryType } from "./types";

export default function MealPlan() {
  const { client, config, configError } = useMealie();
  const { push } = useNavigation();
  const groupSlug = useGroupSlug(client);
  const [monday, setMonday] = useState(() => startOfWeek(new Date()));

  const days = weekDays(monday);
  const from = toIsoDate(days[0]!);
  const to = toIsoDate(days[6]!);

  const { data, isLoading, revalidate } = useCachedPromise(
    (start: string, end: string) => getMealPlan(client!, start, end),
    [from, to],
    {
      execute: client !== undefined,
      initialData: [] as MealPlanEntry[],
      keepPreviousData: true,
      onError: (error) => {
      showFailureToast(error, { title: "Could not load the meal plan" });
    },
    },
  );

  if (configError) return <ConfigErrorView error={configError} />;

  async function run(action: () => Promise<unknown>, failureTitle: string) {
    try {
      await action();
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: failureTitle });
    }
  }

  function addEntry(date: string) {
    push(
      <RecipePicker
        client={client!}
        navigationTitle={"Add to " + date}
        onPick={(recipe) =>
          run(
            () => createMealPlanEntry(client!, { date, entryType: "dinner", recipeId: recipe.id }),
            "Could not add the entry",
          )
        }
        onPickFreeText={(title) =>
          run(() => createMealPlanEntry(client!, { date, entryType: "dinner", title }), "Could not add the entry")
        }
      />,
    );
  }

  async function confirmDelete(entry: MealPlanEntry) {
    const confirmed = await confirmAlert({
      title: "Remove this entry?",
      message: entryTitle(entry) + " on " + entry.date,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) await run(() => deleteMealPlanEntry(client!, entry.id), "Could not remove the entry");
  }

  const weekActions = (
    <>
      <Action
        icon={Icon.ArrowLeft}
        title="Previous Week"
        shortcut={{ modifiers: ["cmd"], key: "[" }}
        onAction={() => setMonday((current) => addDays(current, -7))}
      />
      <Action
        icon={Icon.ArrowRight}
        title="Next Week"
        shortcut={{ modifiers: ["cmd"], key: "]" }}
        onAction={() => setMonday((current) => addDays(current, 7))}
      />
      <Action
        icon={Icon.Calendar}
        title="Current Week"
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        onAction={() => setMonday(startOfWeek(new Date()))}
      />
    </>
  );

  return (
    <List isLoading={isLoading} navigationTitle={"Meal Plan " + from + " to " + to} searchBarPlaceholder="Filter meals">
      {days.map((day) => {
        const iso = toIsoDate(day);
        const entries = data.filter((entry) => entry.date === iso);
        return (
          <List.Section key={iso} title={formatDayLabel(day)} subtitle={iso}>
            {entries.length === 0 && (
              <List.Item
                icon={Icon.Plus}
                title="Nothing planned"
                actions={
                  <ActionPanel>
                    <Action icon={Icon.Plus} title="Add Entry" onAction={() => addEntry(iso)} />
                    {weekActions}
                  </ActionPanel>
                }
              />
            )}
            {entries.map((entry) => (
              <List.Item
                key={entry.id}
                icon={entry.recipe ? Icon.Book : Icon.Pencil}
                title={entryTitle(entry)}
                accessories={[{ tag: entry.entryType }]}
                actions={
                  <ActionPanel>
                    {entry.recipe && groupSlug && (
                      <Action.OpenInBrowser
                        title="Open in Mealie"
                        url={recipeWebUrl(config!.baseUrl, groupSlug, entry.recipe.slug)}
                      />
                    )}
                    <Action icon={Icon.Plus} title="Add Entry" onAction={() => addEntry(iso)} />
                    <ActionPanel.Submenu icon={Icon.Tag} title="Change Meal Type">
                      {PLAN_ENTRY_TYPES.map((type) => (
                        <Action
                          key={type}
                          title={type}
                          onAction={() =>
                            run(
                              () => updateMealPlanEntry(client!, entry, { entryType: type as PlanEntryType }),
                              "Could not change the meal type",
                            )
                          }
                        />
                      ))}
                    </ActionPanel.Submenu>
                    <Action
                      icon={Icon.ArrowRight}
                      title="Move to Next Day"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
                      onAction={() =>
                        run(
                          () =>
                            updateMealPlanEntry(client!, entry, {
                              date: toIsoDate(addDays(new Date(entry.date + "T12:00:00"), 1)),
                            }),
                          "Could not move the entry",
                        )
                      }
                    />
                    <Action
                      icon={Icon.Trash}
                      title="Remove Entry"
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => confirmDelete(entry)}
                    />
                    {weekActions}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function entryTitle(entry: MealPlanEntry): string {
  return entry.recipe?.name || entry.title || "Untitled";
}
```

Hinweis zum Datum in "Move to Next Day": `new Date("2026-09-01")` würde als UTC-Mitternacht gelesen und in westlichen Zeitzonen einen Tag zurückspringen. Deshalb steht dort bewusst `entry.date + "T12:00:00"`, was als lokale Zeit interpretiert wird.

- [ ] **Step 8: Typprüfung, Lint und manuelle Verifikation**

Run: `npx tsc --noEmit && npm run lint`
Expected: Keine Fehler.

Run: `npm run dev`, dann in Raycast:
1. `Meal Plan` öffnen. Expected: Die aktuelle Woche mit den vorhandenen Einträgen.
2. Eine Woche vor und zurück blättern.
3. Eintrag mit Rezept anlegen, Eintrag als Freitext anlegen.
4. Mahlzeitentyp ändern. **Falls hier HTTP 422 erscheint**, kennt die Instanz den gewählten Typ nicht. Den Fehlertext notieren und melden, statt die Typenliste blind zu kürzen.
5. Eintrag auf den nächsten Tag verschieben und löschen.

- [ ] **Step 9: Commit**

```bash
git add src/lib/week.ts src/lib/week.test.ts src/api/mealplan.ts src/components/RecipePicker.tsx src/meal-plan.tsx
git commit -m "feat: Command Meal Plan mit Wochenansicht und CRUD"
```

---

### Task 11: Command "Import Recipe"

**Files:**
- Create: `src/import-recipe.tsx`
- Test: `src/lib/clipboardUrl.test.ts`, Create: `src/lib/clipboardUrl.ts`

**Interfaces:**
- Consumes: `importRecipeFromUrl()`, `getRecipe()`, `recipeWebUrl()`
- Produces: `extractUrl(value?: string | null): string | undefined`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`src/lib/clipboardUrl.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractUrl } from "./clipboardUrl";

describe("extractUrl", () => {
  it("accepts an https URL", () => {
    expect(extractUrl("https://example.org/recipe")).toBe("https://example.org/recipe");
  });

  it("trims surrounding whitespace", () => {
    expect(extractUrl("  https://example.org/r  ")).toBe("https://example.org/r");
  });

  it("rejects plain text", () => {
    expect(extractUrl("Tiramisu ohne Ei")).toBeUndefined();
  });

  it("rejects other schemes so no file path is sent to Mealie", () => {
    expect(extractUrl("file:///etc/passwd")).toBeUndefined();
    expect(extractUrl("javascript:alert(1)")).toBeUndefined();
  });

  it("handles empty input", () => {
    expect(extractUrl(undefined)).toBeUndefined();
    expect(extractUrl("")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Test laufen lassen und Fehlschlag bestätigen**

Run: `npx vitest run src/lib/clipboardUrl.test.ts`
Expected: FAIL, `Failed to resolve import "./clipboardUrl"`

- [ ] **Step 3: `src/lib/clipboardUrl.ts` implementieren**

```ts
/** Nimmt nur http und https an, damit aus der Zwischenablage kein Dateipfad an Mealie geht. */
export function extractUrl(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return trimmed;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/lib/clipboardUrl.test.ts`
Expected: PASS, 6 Tests grün.

- [ ] **Step 5: `src/import-recipe.tsx` anlegen**

Die Ergebnisansicht zeigt bewusst den importierten Namen. Mealies Scraper kann bei Weiterleitungen still das falsche Rezept liefern, eine reine Erfolgsmeldung würde das verdecken.

```tsx
import { useEffect, useState } from "react";
import { Action, ActionPanel, Clipboard, Detail, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ConfigErrorView } from "./components/ConfigErrorView";
import { useGroupSlug, useMealie } from "./hooks/useMealie";
import { getRecipe, importRecipeFromUrl } from "./api/recipes";
import { extractUrl } from "./lib/clipboardUrl";
import { recipeWebUrl } from "./lib/urls";
import type { RecipeSummary } from "./types";

export default function ImportRecipe() {
  const { client, config, configError } = useMealie();
  const { push } = useNavigation();
  const [defaultUrl, setDefaultUrl] = useState<string>();
  const [urlError, setUrlError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    Clipboard.readText()
      .then((text) => setDefaultUrl(extractUrl(text) ?? ""))
      .catch(() => setDefaultUrl(""));
  }, []);

  if (configError) return <ConfigErrorView error={configError} />;

  async function submit(values: { url: string; includeTags: boolean }) {
    const url = extractUrl(values.url);
    if (!url) {
      setUrlError("Enter a valid http or https URL");
      return;
    }
    setUrlError(undefined);
    setIsLoading(true);

    const toast = await showToast({ style: Toast.Style.Animated, title: "Importing recipe" });
    try {
      const slug = await importRecipeFromUrl(client!, url, values.includeTags);
      const recipe = await getRecipe(client!, slug);
      toast.style = Toast.Style.Success;
      toast.title = "Imported";
      toast.message = recipe.name;
      push(<ImportResult recipe={recipe} baseUrl={config!.baseUrl} sourceUrl={url} />);
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Mealie could not import this URL" });
    } finally {
      setIsLoading(false);
    }
  }

  if (defaultUrl === undefined) return <Form isLoading />;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Download} title="Import Recipe" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Recipe URL"
        placeholder="https://example.org/some-recipe"
        defaultValue={defaultUrl}
        error={urlError}
        onChange={() => setUrlError(undefined)}
        autoFocus
      />
      <Form.Checkbox id="includeTags" title="Tags" label="Import tags from the source" defaultValue={false} />
      <Form.Description text="Mealie scrapes the page on the server. Check the recipe name afterwards, redirects can make the scraper land on a different page." />
    </Form>
  );
}

function ImportResult({ recipe, baseUrl, sourceUrl }: { recipe: RecipeSummary; baseUrl: string; sourceUrl: string }) {
  const { client } = useMealie();
  const groupSlug = useGroupSlug(client);

  const markdown = [
    "# " + recipe.name,
    "",
    recipe.description ?? "_No description_",
    "",
    "---",
    "",
    "Imported from: " + sourceUrl,
    "",
    "**Check that this is the recipe you expected.**",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Import Result"
      actions={
        <ActionPanel>
          {groupSlug && (
            <Action.OpenInBrowser title="Open in Mealie" url={recipeWebUrl(baseUrl, groupSlug, recipe.slug)} />
          )}
          <Action.OpenInBrowser title="Open Original Source" url={sourceUrl} />
        </ActionPanel>
      }
    />
  );
}
```

- [ ] **Step 6: Typprüfung, Lint und manuelle Verifikation**

Run: `npx tsc --noEmit && npm run lint`
Expected: Keine Fehler.

Run: `npm run dev`, dann in Raycast:
1. Eine Rezept-URL kopieren, `Import Recipe` öffnen. Expected: Das Feld ist vorbelegt.
2. Importieren. Expected: Ergebnisansicht mit dem Rezeptnamen, Enter öffnet es in Mealie.
3. Eine Nicht-Rezept-URL importieren. Expected: Ein Toast mit Mealies eigener Fehlermeldung, kein Absturz.

- [ ] **Step 7: Commit**

```bash
git add src/import-recipe.tsx src/lib/clipboardUrl.ts src/lib/clipboardUrl.test.ts
git commit -m "feat: Command Import Recipe mit Zwischenablage-Vorbelegung und Ergebnisprüfung"
```

---

### Task 12: Rezept-Actions vernetzen, Doku und Abschluss

Erst jetzt existieren alle APIs, die "Search Recipes" für seine Nebenactions braucht. Die in Task 5 offengelassenen Actions werden hier nachgerüstet.

**Files:**
- Modify: `src/search-recipes.tsx`
- Create: `src/components/AddRecipeActions.tsx`, `README.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: `getShoppingLists()`, `addRecipeToList()`, `createMealPlanEntry()`, `toIsoDate()`
- Produces: `<AddRecipeActions client recipe />`

- [ ] **Step 1: `src/components/AddRecipeActions.tsx` anlegen**

```tsx
import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { addRecipeToList, getShoppingLists } from "../api/shopping";
import { createMealPlanEntry } from "../api/mealplan";
import { addDays, formatDayLabel, toIsoDate } from "../lib/week";
import type { MealieClient } from "../api/client";
import type { RecipeSummary, ShoppingList } from "../types";

export function AddRecipeActions({ client, recipe }: { client: MealieClient; recipe: RecipeSummary }) {
  const { push } = useNavigation();

  return (
    <>
      <Action
        icon={Icon.Cart}
        title="Add Ingredients to Shopping List"
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        onAction={() => push(<PickList client={client} recipe={recipe} />)}
      />
      <Action
        icon={Icon.Calendar}
        title="Add to Meal Plan"
        shortcut={{ modifiers: ["cmd"], key: "m" }}
        onAction={() => push(<PickDay client={client} recipe={recipe} />)}
      />
    </>
  );
}

function PickList({ client, recipe }: { client: MealieClient; recipe: RecipeSummary }) {
  const { pop } = useNavigation();
  const { data, isLoading } = useCachedPromise(() => getShoppingLists(client), [], {
    initialData: [] as ShoppingList[],
  });

  async function add(list: ShoppingList) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding ingredients" });
    try {
      await addRecipeToList(client, list.id, recipe.id);
      toast.style = Toast.Style.Success;
      toast.title = "Added to " + list.name;
      pop();
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could not add the ingredients" });
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={"Add " + recipe.name} searchBarPlaceholder="Pick a shopping list">
      {data.map((list) => (
        <List.Item
          key={list.id}
          icon={Icon.Cart}
          title={list.name}
          actions={
            <ActionPanel>
              <Action icon={Icon.Plus} title="Add Ingredients Here" onAction={() => add(list)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function PickDay({ client, recipe }: { client: MealieClient; recipe: RecipeSummary }) {
  const { pop } = useNavigation();
  const days = Array.from({ length: 14 }, (_, index) => addDays(new Date(), index));

  async function add(date: Date) {
    const iso = toIsoDate(date);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding to meal plan" });
    try {
      await createMealPlanEntry(client, { date: iso, entryType: "dinner", recipeId: recipe.id });
      toast.style = Toast.Style.Success;
      toast.title = "Planned for " + iso;
      pop();
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could not add the entry" });
    }
  }

  return (
    <List navigationTitle={"Plan " + recipe.name} searchBarPlaceholder="Pick a day">
      {days.map((day) => (
        <List.Item
          key={toIsoDate(day)}
          icon={Icon.Calendar}
          title={formatDayLabel(day)}
          subtitle={toIsoDate(day)}
          actions={
            <ActionPanel>
              <Action icon={Icon.Plus} title="Plan for This Day" onAction={() => add(day)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

- [ ] **Step 2: `src/search-recipes.tsx` erweitern**

Import ergänzen:

```tsx
import { AddRecipeActions } from "./components/AddRecipeActions";
```

Im `ActionPanel` des `List.Item` hinter der `Copy Mealie Link`-Action einfügen:

```tsx
{client && <AddRecipeActions client={client} recipe={recipe} />}
```

- [ ] **Step 3: `README.md` schreiben**

````markdown
# Mealie for Raycast

Manage your [Mealie](https://mealie.io) recipes, shopping lists and meal plan without leaving Raycast.

## Commands

| Command | What it does |
|---|---|
| Search Recipes | Search your recipes. Enter opens the recipe page in Mealie. |
| Add to Shopping List | Add an item with autocompletion over your existing Mealie foods, so the item keeps its aisle label. Free text works too. |
| Shopping Lists | Browse lists, check items off, add and remove items, create, rename and delete lists. |
| Meal Plan | Week view of your meal plan. Add, retype, move and remove entries. |
| Import Recipe | Import a recipe from a URL using Mealie's server-side scraper. |

## Setup

1. In Mealie, open your profile, then **Manage API Tokens**, and create a token.
2. Run any command of this extension in Raycast. It asks for two values:
   - **Mealie URL**, for example `https://mealie.example.org`
   - **API Token**, the token from step 1

The token is stored in the macOS Keychain by Raycast. It is never written to disk by this extension.

### HTTPS

The extension refuses to send your token over plain HTTP unless the host is `localhost`. If your instance is only reachable over HTTP inside a trusted network, enable **Allow plain HTTP outside localhost** in the extension preferences. Be aware that your API token then travels unencrypted.

## Requirements

- Mealie 2.0 or newer
- Node 22.22.2 or newer for development

## Development

```bash
npm install
npm run dev     # run the extension in Raycast
npm test        # unit tests for the API layer
npm run lint
```

The `src/api` and `src/lib` folders never import `@raycast/api`, which keeps them testable under Vitest.
````

- [ ] **Step 4: `CHANGELOG.md` schreiben**

```markdown
# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Search recipes and open them in Mealie
- Add items to a shopping list with autocompletion over existing Mealie foods, keeping the aisle label
- Browse and manage shopping lists, including checking items off with optimistic updates
- Week view of the meal plan with add, retype, move and remove
- Import recipes from a URL, with the imported name shown for verification
```

- [ ] **Step 5: Gesamtprüfung**

Run: `npx vitest run`
Expected: PASS, alle Tests grün.

Run: `npx tsc --noEmit`
Expected: Keine Fehler.

Run: `npm run lint`
Expected: Keine Fehler.

Run: `npm run build`
Expected: Erfolgreicher Build ohne Warnungen.

- [ ] **Step 6: Alle fünf Commands manuell durchgehen**

Checkliste, jeweils gegen die echte Instanz:

1. `Search Recipes`: Suche, Enter öffnet die Mealie-Seite, `Cmd+S` legt die Zutaten auf eine Liste, `Cmd+M` plant das Rezept ein.
2. `Add to Shopping List`: Autocompletion trifft Treffer in der Wortmitte, Label wird übernommen, Freitext funktioniert.
3. `Shopping Lists`: Sektionsreihenfolge entspricht Mealie, Abhaken lässt Menge und Notiz unverändert, CRUD auf Listen funktioniert.
4. `Meal Plan`: Wochennavigation, Anlegen, Typ ändern, Verschieben, Löschen.
5. `Import Recipe`: Vorbelegung aus der Zwischenablage, Import, Ergebnisname stimmt, Fehlerfall zeigt einen verständlichen Toast.

- [ ] **Step 7: Commit und Push**

```bash
git add src/components/AddRecipeActions.tsx src/search-recipes.tsx README.md CHANGELOG.md
git commit -m "feat: Rezept-Actions für Einkaufsliste und Essensplan, README und CHANGELOG"
git push -u origin feat/extension-grundgeruest
```

---

## Spec-Abdeckung

| Spec-Abschnitt | Task |
|---|---|
| 4.1 Search Recipes | Task 5, Nebenactions in Task 12 |
| 4.2 Shopping Lists | Task 9 |
| 4.3 Add to Shopping List | Task 8 |
| 4.4 Meal Plan | Task 10 |
| 4.5 Import Recipe | Task 11 |
| 5 Architektur, Modulschnitt | Tasks 1 bis 4 |
| 6 Datenfluss und Caching | Tasks 5, 8, 9, 10 |
| 7 Fehlerbehandlung | Task 2 fürs Mapping, ConfigErrorView in Task 5 |
| 8 Zugangsdaten und HTTPS-Guard | Tasks 1 und 2 |
| 9 Teststrategie | Tests in Tasks 2, 3, 4, 6, 7, 10, 11 |
| 10 Store-Tauglichkeit | Tasks 1 und 12 |
