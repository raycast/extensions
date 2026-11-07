# Neuen Password-Manager-Adapter hinzufügen

Jeder Password Manager wird in **einer eigenen Datei** unter `src/adapters/` implementiert.

## Schritte

### 1. Adapter-Datei anlegen

Erstelle z. B. `src/adapters/1password.ts` und implementiere das `PasswordManagerAdapter`-Interface aus `src/types.ts`:

```typescript
import type { AdapterStatus, PasswordManagerAdapter, VaultItem } from "../types";
import { parseJson, resolveBinary, runCli } from "../utils/cli";
import { getCliPathOverride } from "../registry";

export const onePasswordAdapter: PasswordManagerAdapter = {
  id: "1password",
  name: "1Password",
  cliBinary: "op",

  async isAvailable(): Promise<AdapterStatus> {
    const binary = await resolveBinary(this.cliBinary, getCliPathOverride(this.id));
    if (!binary) {
      return { ok: false, reason: "1Password CLI (op) not found" };
    }
    try {
      await runCli(binary, ["--version"]);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : "1Password CLI not ready",
      };
    }
  },

  async listItems(): Promise<VaultItem[]> {
    // op item list --format json — volle Liste für lokales Filtern in der UI
  },

  async searchItems(query: string): Promise<VaultItem[]> {
    // Optional: filterVaultItems(await listItems(), query)
  },

  async getPassword(item: VaultItem): Promise<string> {
    // op read op://vault/item/password oder op item get --field password --reveal
  },

  async getUsername(item: VaultItem): Promise<string | undefined> {
    // op item get <id> --field username
  },

  async getTotp(item: VaultItem): Promise<string | undefined> {
    // op item get <id> --otp
  },

  async getUrl(item: VaultItem): Promise<string | undefined> {
    // op item get <id> --field url oder aus Item-Metadaten
  },

  async openInManager(item: VaultItem): Promise<void> {
    // z.B. open(`onepassword://open/i?a=...&v=...&i=...&h=...`)
  },
};
```

Siehe `protonpass.ts` für eine vollständige CLI-Implementierung und Referenztabelle.

### 2. In der Registry registrieren

In `src/adapters/index.ts` importieren und zur Liste hinzufügen:

```typescript
import { onePasswordAdapter } from "./1password";

export const adapters: PasswordManagerAdapter[] = [protonPassAdapter, onePasswordAdapter];
```

### 3. CLI-Pfad konfigurieren (optional)

Falls die CLI nicht im Standard-PATH liegt, in den Extension-Einstellungen unter **CLI Path Overrides (JSON)**:

```json
{ "1password": "/opt/homebrew/bin/op" }
```

### 4. Standard-Manager setzen (optional)

In den Extension-Einstellungen **Default Manager** wählen (z. B. `Proton Pass`). Bei **Auto** wird der erste verfügbare Adapter genutzt.

Beim Hinzufügen eines neuen Adapters den Eintrag im `data`-Array der Preference `defaultManagerId` in `package.json` ergänzen, damit das Dropdown ihn anbietet.

## Interface-Übersicht

| Methode                      | Zweck                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `isAvailable()`              | CLI installiert und Session/Auth gültig?                                                |
| `listItems?()`               | Volle Item-Liste (empfohlen bei vollem Vault-Load; UI cached pro Session)               |
| `searchItems(query)`         | Einträge suchen/listen (für serverseitige Suche oder als Fallback ohne `listItems`)     |
| `getPassword(item)`          | Passwort für Item-ID holen                                                              |
| `getUsername(item)`          | Username holen (optional)                                                               |
| `getEmail(item)`             | E-Mail holen (optional)                                                                 |
| `getTotp(item)`              | TOTP-Code holen (optional)                                                              |
| `getUrl?(item)`              | Website-URL holen (optional)                                                            |
| `openInManager?(item)`       | Item im Password-Manager öffnen (optional, adapter-spezifisch; z.B. 1Password Deeplink) |
| `getAuthRequirements?()`     | Felder für das Entsperr-Formular (optional; Master-Passwort / PIN)                      |
| `authenticate?(credentials)` | Session entsperren (optional)                                                           |

## CLI-Hilfen

- `resolveBinary(name, customPath?)` — Binary im PATH oder Override finden
- `runCli(binary, args, options?)` — CLI ausführen mit Timeout und Fehlerbehandlung
- `parseJson<T>(stdout)` — JSON-Ausgabe parsen

Alle in `src/utils/cli.ts`.

## Externe Adapter (Third-Party)

Adapter können auch **außerhalb der Extension** liegen und per JSON-Stdio-Protokoll angesprochen werden. Die Extension startet dabei einen separaten Prozess — kein dynamisches Laden von Extension-Code.

### Setup

1. Adapter-Ordner anlegen, z. B. `~/.config/vaultcast/adapters/my-adapter/`
2. `pwm-adapter.json` + ausführbares Script hinzufügen
3. In den Extension-Einstellungen **External Adapters Directory** auf den übergeordneten Ordner setzen

Beispiel:

```
~/.config/vaultcast/adapters/
  my-adapter/
    pwm-adapter.json
    adapter.js
```

Referenz: [`examples/external-adapter/protonpass`](../../examples/external-adapter/protonpass/README.md)

### Manifest (`pwm-adapter.json`)

```json
{
  "id": "my-adapter",
  "name": "My Password Manager",
  "command": "./adapter.js",
  "mode": "persistent",
  "capabilities": ["listItems", "getUrl", "getItemAvailability", "getAuthRequirements", "authenticate"]
}
```

`mode` is optional (`one-shot` default). Persistent adapters keep a helper process open while Search Passwords is visible.

`capabilities` steuert optionale Methoden. Immer verfügbar über das Protokoll:

- `isAvailable`, `searchItems`, `getPassword`, `getUsername`, `getEmail`, `getTotp`

Auth (optional):

- `getAuthRequirements` — Felder für das Entsperr-Formular (`password`, `pin`, `text`)
- `authenticate` — Credentials nur im Helfer-RAM speichern
- `isAvailable` mit `{ ok: false, reason, needsAuth: true }` wenn Setup ok, aber Unlock nötig

Session:

- Escape / Fenster schließen beendet den Helfer, **nicht** die Extension-Session (sofern **Enable extension session** an ist)
- Preference **Enable extension session** (Default an): Master-PW/PIN bleiben im Raycast-Prozess-RAM. Gesperrte Password Manager werden still neu entsperrt, bis die Session abläuft oder Raycast beendet wird
- Preference **Session timeout (minutes)** (Default 15): nach Inaktivität sperrt die Extension-Session (Touch ID) bzw. ohne Extension-Session den Password Manager
- Action **Lock Session**: gleicher Zustand wie Timeout (Helfer weg). Mit Extension-Session bleiben Credentials im RAM; Unlock per Touch ID

### Touch ID (macOS)

Die Logik liegt nur in der Extension (`src/utils/credential-vault.ts`, `src/utils/biometric-auth.ts` + Swift-Package `swift/` über die Raycast-Swift-Integration). Adapter-Scripts (`adapter.js`) sehen weiterhin nur `authenticate(credentials)`.

Flow:

1. User entsperrt mit Master-Passwort oder PIN (`getAuthRequirements` / `authenticate`).
2. Wenn **Enable extension session** an ist: Credential-Map im Prozess-RAM (`src/utils/credential-vault.ts`). Password Manager, die sich selbst sperren, werden still mit diesen Credentials neu entsperrt.
3. Timeout oder **Lock Session**: Helfer wird beendet, RAM bleibt. Re-Auth ist Touch ID / Apple Watch / Gerätecode über `LocalAuthentication` (kein Keychain-Read). Danach wieder stilles PWM-Unlock.
4. Raycast komplett beenden: RAM ist weg. Nächster Start verlangt wieder Master-PW/PIN. Es wird nichts in der Keychain oder auf Disk gespeichert.
5. Escape ohne laufenden Biometrie-Prompt: Helfer stirbt, Extension-Session bleibt aktiv bis Timeout oder Raycast-Quit.

Limits:

- macOS only; ohne Biometrie/Gerätecode fällt die UI auf das Formular zurück (Windows: nach Timeout immer Formular).
- Der System-Prompt kann das Raycast-Fenster schließen. Währenddessen hält die Extension den Helfer (`biometricUnlockInProgress`). Nach Erfolg Search Passwords ggf. erneut öffnen.
- `ray build` / `ray develop` kompilieren das Swift-Package (Xcode 16.3+ nötig).

Vollständige Protokollreferenz: Abschnitt **Externe Adapter** in dieser Datei; Beispiele unter `examples/external-adapter/`.

### Sicherheit

- Die Extension führt nur vom User konfigurierte Adapter-Commands aus (`execFile`, kein Shell)
- Adapter-Code läuft als separater User-Prozess
- Nur vertrauenswürdige Adapter installieren

### Built-in vs. extern

- Gleiche `id` wie ein Built-in-Adapter → Built-in hat Vorrang, externer Adapter wird übersprungen
- Externe Adapter erscheinen automatisch im Manager-Dropdown der Suche
- Für externe Adapter als Default: **Default Manager Override** in den Einstellungen setzen
