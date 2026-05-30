<p align="center">
  <img src="../../assets/local2fa.png" alt="Local 2FA — Offline-TOTP-Manager für Raycast" width="100%" />
</p>

# Local 2FA für Raycast

<p align="center">
  Offline, local-first 2FA-TOTP-Manager für Raycast unter macOS.
</p>

<p align="center">
  <a href="../../README.md">English</a> ·
  <a href="./README.es.md">Español</a> ·
  <a href="./README.pt-BR.md">Português (BR)</a> ·
  <a href="./README.de.md">Deutsch</a> ·
  <a href="./README.fr.md">Français</a>
</p>

<p align="center">
  <a href="https://github.com/vayaSEO/local-2fa/releases"><img src="https://img.shields.io/github/v/release/vayaSEO/local-2fa?display_name=tag" alt="Neueste Version" /></a>
  <a href="https://github.com/vayaSEO/local-2fa/blob/main/LICENSE"><img src="https://img.shields.io/github/license/vayaSEO/local-2fa" alt="Lizenz" /></a>
  <a href="https://github.com/vayaSEO/local-2fa/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/vayaSEO/local-2fa/ci.yml?branch=main" alt="CI" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-339933" alt="Node >=20" />
  <img src="https://img.shields.io/badge/local--first-keine%20Cloud-informational" alt="Local-first" />
  <img src="https://img.shields.io/badge/crypto-AES--256--GCM-blue" alt="AES-256-GCM" />
</p>

> Persönliches Open-Source-Projekt. Nicht unabhängig auditiert.

---

## Vorschau

<p align="center">
  <img src="../../metadata/local-2fa-1.png" alt="List-Codes-Ansicht" width="850" />
</p>

<p align="center">
  <img src="../../metadata/local-2fa-2.png" alt="Add-Account-Ansicht" width="850" />
</p>

<p align="center">
  <img src="../../metadata/local-2fa-3.png" alt="Import from QR Image" width="850" />
</p>

## Warum dieses Projekt

- Halte 2FA-Secrets lokal auf deinem Mac.
- Vermeide Cloud-Sync und externe OTP-Dienste.
- Schneller Raycast-nativer Workflow für tägliches Copy/Paste.

## Funktionen

- RFC-6238-TOTP-Generierung (`SHA1`, `SHA256`, `SHA512`)
- 6 oder 8 Stellen, konfigurierbarer Zeitraum
- Lokal verschlüsselte Speicherung (`AES-256-GCM`)
- Lokaler Import von:
  - `otpauth://`-URL
  - `otpauth-migration://`-URL (Google-Authenticator-Export)
  - PNG-QR-Bilddateien (lokal dekodiert, reines JS, keine externen Binärdateien)

## Befehle

- **List Codes** — Konten anzeigen, kopieren, einfügen und löschen
- **Add Account** — vereinheitlichter Flow:
  - `otpauth://`-URL einfügen
  - Felder aus URL automatisch ausfüllen
  - oder Felder manuell eingeben
- **Import Google Migration** — `otpauth-migration://...` einfügen
- **Import from QR Image** — eine oder mehrere lokale PNG-QR-Bilder wählen

## Schnellstart

Für den normalen Gebrauch brauchst du nur Raycast + installierte Extension.

```bash
npm install
npm run lint
npm test
npm run dev
```

## Anforderungen

- macOS
- Raycast
- Node.js 20+

Keine externen Binärdateien erforderlich. `Import from QR Image` dekodiert PNGs
in reinem JavaScript (`qr` + `pngjs`). Exportiere QR-Bilder als PNG, falls sie
in einem anderen Format vorliegen.

## Sicherheitsmodell (Kurzfassung)

- Verschlüsselung: `AES-256-GCM`
- KDF: `PBKDF2-SHA256` (600.000 Iterationen, OWASP 2023)
- Salt: 16 zufällige Bytes pro Speichervorgang
- IV: 12 zufällige Bytes pro Speichervorgang
- Master Password: Raycast-`password`-Preference (von Raycast im macOS Keychain abgelegt)
- Verschlüsselungs-Versionierung: aktuell v2, transparente Abwärtskompatibilität mit v1-Vaults (210k iter)

Vollständiges Threat-Model in [SECURITY.md](../../SECURITY.md).

## Recovery-Warnung

Wenn du dein Master Password verlierst, können die verschlüsselten Daten nicht wiederhergestellt werden.
Behalte immer:

- Recovery-Codes des jeweiligen Dienstes
- die ursprünglichen Setup-Secrets / QR-Payloads
- ein separates Backup deiner Zugangsdaten

## Einschränkungen

- Kein Cloud-Sync (bewusst)
- Kein Geräte-übergreifender Sync (bewusst)
- Noch keine Konto-Export-Funktion

## Mitwirken

1. Forken oder klonen.
2. Branch erstellen.
3. `npm run lint && npm test && npm run build` ausführen.
4. PR mit klarer Änderungs-Zusammenfassung öffnen.

Maintainer-Workflow: [MAINTAINERS.md](../../MAINTAINERS.md).

## Sicherheitslücken melden

Öffne keine öffentlichen Issues für Sicherheitslücken.
Nutze [GitHub Security Advisories](https://github.com/vayaSEO/local-2fa/security/advisories/new)
oder kontaktiere `contacto@davidsitjes.com` privat.

## Lizenz

MIT. Siehe [LICENSE](../../LICENSE).
