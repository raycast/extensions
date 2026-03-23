# RAYCAST-EXTENSION-BUILDER.md
**Skill für Claude Code | Update:** März 2026  
**Speicherort:** `~/projects/raycast-extension-builder/skill.md`  
**Extensions:** `~/projects/raycast-extensions/`

---

## AGENT KONTEXT

```
ROLLE: Raycast Extension Developer
EDITOR: VSCode (ausschließlich)
PFADE: ~/projects/ (nie /Users/wdeupro/)
VALIDIERUNG: npm run build && npm run lint
OUTPUT: Production-ready TypeScript, Store-kompatibel
```

---

## KRITISCHE REGELN

### TypeScript
```typescript
// ✅ Immer explizite Types
let match: RegExpExecArray | null;

// ❌ Nie implicit any
let match;

// ✅ Optional Chaining
const groups = match?.groups;

// ✅ void bei Toasts
void showToast({...});

// ❌ Kein Browser Storage
localStorage, sessionStorage  // VERBOTEN

// ✅ React State stattdessen
const [data, setData] = useState<string>("");
```

### Gültige Icons (Auswahl)
```typescript
// ✅
Icon.Book, Icon.List, Icon.Box, Icon.Coins, Icon.Hashtag,
Icon.MagnifyingGlass, Icon.XMarkCircle, Icon.Star

// ❌ Existieren nicht
Icon.Truck, Icon.Euro, Icon.Barcode
```

### Assets
```bash
# Icon: exakt 512x512px PNG
assets/extension-icon.png
# → Generator: https://ray.so/icon

# Screenshots: exakt 2000x1250px PNG
metadata/extension-name-1.png

# Resize falls nötig:
sips --padToHeightWidth 1250 2000 --padColor 1C1C1E screenshot.png
```

---

## PROJEKTSTRUKTUR

```
~/projects/raycast-extensions/
└── extension-name/
    ├── src/
    │   ├── command-name.tsx      # Dateiname = Command-name in package.json
    │   └── __tests__/
    ├── assets/
    │   └── extension-icon.png    # 512x512
    ├── metadata/
    │   ├── name-1.png            # 2000x1250
    │   └── name-2.png
    ├── .vscode/
    │   ├── tasks.json
    │   └── launch.json
    ├── eslint.config.js          # PFLICHT ab ESLint v9 – siehe unten
    ├── package.json
    ├── tsconfig.json
    ├── README.md
    ├── CHANGELOG.md
    └── LICENSE                   # MIT
```

> ⚠️ **Entry Point Regel:** Der `name` jedes Commands in `package.json` muss
> exakt dem Dateinamen in `src/` entsprechen.  
> Command `"name": "sync-project"` → Datei `src/sync-project.tsx`

---

## WIEDERKEHRENDE FEHLER & FIXES

### 1. ESLint: eslint.config.js fehlt (ESLint v9)

**Fehler:**
```
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
```

**Ursache:** Ab ESLint v9 ist `.eslintrc.*` veraltet. Raycast CLI erstellt `eslint.config.js`
automatisch — bei manuell erstellten oder kopierten Extensions fehlt sie.

**Fix:** Datei im Projektroot anlegen:
```js
// eslint.config.js
const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
]);
```

Oder aus einer bestehenden Extension kopieren:
```bash
cp ~/projects/raycast-extensions/test-fur-claude/eslint.config.js .
```

---

### 2. Prettier: Code style issues

**Fehler:**
```
error  Code style issues found. Please run Prettier 3.x (ray lint --fix).
```

**Fix — immer zuerst:**
```bash
npm run fix-lint   # korrigiert Prettier + ESLint automatisch
npm run lint       # danach prüfen
```

Nie manuell Prettier-Fehler beheben — `fix-lint` macht das in einem Durchgang.

---

### 3. Build: Entry point not found

**Fehler:**
```
Error: build failed: could not find an entry point for the command "xyz"
```

**Ursachen (Checkliste):**
```bash
# a) Tippfehler im Verzeichnisnamen (häufigste Ursache!)
ls src/          # "scr" statt "src" sofort sichtbar

# b) Dateiname stimmt nicht mit Command-name überein
# package.json: "name": "sync-project"
# → Datei muss heißen: src/sync-project.tsx

# c) Veraltetes Build-Flag
# ❌ "ray build -e dist"  (veraltet)
# ✅ "ray build"
```

---

## WORKFLOW

### Phase 0: Scaffolding (EMPFOHLEN)

**Immer in Raycast initialisieren**, dann src-Dateien einkopieren:
```
Raycast → Create Extension → Template wählen → Projektname
```
Dadurch entstehen automatisch korrekt:
- `eslint.config.js`
- `raycast-env.d.ts`
- `.gitignore`, `.prettierrc`
- `tsconfig.json` mit richtigen compilerOptions

Danach:
```bash
cd ~/projects/raycast-extensions/extension-name
# Eigene src/-Dateien einkopieren
npm install
npm run fix-lint   # Prettier-Formatting anpassen
npm run build
```

### Phase 1: Implementierung

**Standard-Pattern:**
```typescript
import { List, Action, ActionPanel, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { getSelectedText, Clipboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");

  useEffect(() => {
    async function init() {
      try {
        const selected = await getSelectedText();
        if (selected) setSearchText(selected);
      } catch {
        const clip = await Clipboard.readText();
        if (clip) setSearchText(clip);
      }
    }
    init();
  }, []);

  const { data, isLoading, error } = useCachedPromise(
    async (query: string) => { /* fetch */ },
    [searchText],
    { keepPreviousData: true }
  );

  if (error) return (
    <List.EmptyView icon={Icon.XMarkCircle} title="Fehler" description={error.message} />
  );

  return <List isLoading={isLoading} onSearchTextChange={setSearchText}>
    {data?.map(item => (
      <List.Item key={item.id} title={item.title} />
    ))}
  </List>;
}
```

**API mit Credentials:**
```typescript
import { getPreferenceValues } from "@raycast/api";

interface Preferences { apiKey: string; }
const prefs = getPreferenceValues<Preferences>();
```

### Phase 2: Validierung
```bash
npm run fix-lint   # IMMER zuerst — Prettier + ESLint auto-fix
npm run lint       # danach prüfen, sollte 0 Fehler zeigen
npm run build      # Build
npm run dev        # Test in Raycast
```

### Phase 3: Git & Publish
```bash
# Git (manuell ausführen, nie automatisch!)
git add .
git commit -m "Add: extension-name – kurze Beschreibung"
git push origin main

# Store
npm run publish
```

---

## VSCODE TASKS (auto-generiert)

```json
{
  "version": "2.0.0",
  "tasks": [
    { "label": "Build",     "command": "npm run build",    "group": { "kind": "build", "isDefault": true } },
    { "label": "Fix Lint",  "command": "npm run fix-lint", "group": "test" },
    { "label": "Lint",      "command": "npm run lint" },
    { "label": "Dev Mode",  "command": "npm run dev",      "isBackground": true },
    { "label": "Pre-Check", "command": "raycast-check" }
  ]
}
```

---

## KATEGORIEN & TEMPLATES

| Kategorie | Templates | Beispiel |
|-----------|-----------|---------|
| Code (14) | api-integration, code-snippets, developer-tools | GitHub Search |
| Writing (5) | text-processor, grammar-checker, content-generator | Markdown Tools |
| Fun (3) | random-generator, game, easter-egg | Joke of the Day |
| Ideas (2) | note-taking, brainstorm | Quick Capture |
| Misc (13) | calculator, quick-action, system-info | Unit Converter |

---

## package.json Template

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "extension-name",
  "title": "Extension Title",
  "description": "Unter 200 Zeichen, klare Nutzen-Aussage",
  "icon": "extension-icon.png",
  "author": "wdeu",
  "platforms": ["macOS"],
  "license": "MIT",
  "categories": ["Productivity"],
  "keywords": ["keyword1", "keyword2"],
  "commands": [{
    "name": "main-command",
    "title": "Command Title",
    "subtitle": "Category",
    "description": "Was dieser Command macht",
    "mode": "view"
  }],
  "preferences": [{
    "name": "apiKey",
    "title": "API Key",
    "description": "Use 'test' for demo",
    "type": "password",
    "required": false,
    "default": "test",
    "placeholder": "test"
  }],
  "dependencies": {
    "@raycast/api": "^1.104.10",
    "@raycast/utils": "^1.17.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^2.0.4",
    "@types/node": "22.13.10",
    "@types/react": "19.0.10",
    "eslint": "^9.22.0",
    "prettier": "^3.5.3",
    "typescript": "^5.8.2"
  },
  "scripts": {
    "build": "ray build",
    "dev": "ray develop",
    "fix-lint": "ray lint --fix",
    "lint": "ray lint",
    "prepublishOnly": "echo \"\\n\\nIt seems like you are trying to publish the Raycast extension to npm.\\n\\nIf you did intend to publish it to npm, remove the \\`prepublishOnly\\` script and rerun \\`npm publish\\` again.\\nIf you wanted to publish it to the Raycast Store instead, use \\`npm run publish\\` instead.\\n\\n\" && exit 1",
    "publish": "npx @raycast/api@latest publish"
  }
}
```

**Nicht verwenden:**
- ❌ `"owner": "wdeu-team"` — nicht nötig, kann Build-Probleme verursachen
- ❌ `"ray build -e dist"` — veraltetes Flag, nur `"ray build"`
- ❌ `@raycast/eslint-config": "^1.0.11"` — veraltet, `^2.0.4` verwenden
- ❌ `"eslint": "^8.x"` — veraltet, `^9.22.0` verwenden

---

## HÄUFIGE FEHLER

| Fehler | Ursache | Fix |
|--------|---------|-----|
| `eslint.config.js not found` | ESLint v9, Datei fehlt | Aus Lehr-Extension kopieren |
| `Code style issues found` | Prettier nicht gelaufen | `npm run fix-lint` |
| `could not find entry point` | Tippfehler `scr/` oder falscher Dateiname | `ls src/` prüfen |
| `Cannot find Icon.Truck` | Icon existiert nicht | `Icon.Box` verwenden |
| `Type 'null' not assignable` | Implicit any | `let x: Type \| null` |
| `localStorage not defined` | Browser-API | `useState` verwenden |
| Build schlägt fehl | fehlende Deps | `npm install` |

---

## RESSOURCEN

- Icons: https://developers.raycast.com/api-reference/user-interface/icons
- Store-Guidelines: https://developers.raycast.com/basics/prepare-an-extension-for-store
- Icon-Generator: https://ray.so/icon
- API-Docs: https://developers.raycast.com

---

## SKILL AKTIVIERUNG (für Claude Code)

```
RAYCAST EXTENSION BUILDER AKTIV

Pfade:
  Extensions:  ~/projects/raycast-extensions/
  Templates:   ~/projects/raycast-extension-builder/templates/
  GitHub:      https://github.com/wdeu/raycast-extensions

Bereit für:
  - Neue Extension (immer zuerst in Raycast initialisieren!)
  - Debugging bestehender Extensions
  - Store-Submission-Vorbereitung
  - Git-Workflow

Bei Lint-Fehlern: immer zuerst npm run fix-lint

→ Extension-Idee oder Debug-Request eingeben
```

---

*Werner Deuermeier · 2026*
