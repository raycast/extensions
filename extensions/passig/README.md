# Passig per Raycast

Estensione Raycast per il password manager zero-knowledge **Passig**. Tutta la crittografia avviene sul Mac con la stessa libreria condivisa (`@passig/shared`, libsodium): il server riceve e restituisce solo blob cifrati.

## Comandi

| Comando | Cosa fa |
|---|---|
| **Cerca password** | Ricerca fuzzy per titolo, username, sito e vault (raggruppata per vault). Azioni: copia password (nascosta, cancellata dopo 30 s), incolla password nell'app in primo piano, copia username, copia/incolla codice TOTP, apri sito, dettagli (password nascosta con toggle `⌘⇧P`), aggiorna dal server, blocca. |
| **Salva password** | Crea un elemento di tipo login in un vault scrivibile (titolo, username, password con generatore `⌘G`, URL, TOTP, note). |
| **Genera password** | Generatore con lunghezza e set di caratteri; copia o incolla. Non richiede lo sblocco. |
| **Blocca Passig** | Cancella le chiavi in cache e svuota gli appunti se contengono un segreto copiato. |
| **Pulizia appunti Passig** | Comando in background (ogni minuto) che svuota gli appunti se contengono ancora un segreto copiato da almeno 30 s. |

## Installazione (sviluppo)

Richiede macOS con Raycast e Node ≥ 20.

```bash
# dal root del monorepo
pnpm install
pnpm --filter @passig/shared build
pnpm --filter @passig/client-core build
cd apps/raycast
pnpm dev          # = ray develop: importa l'estensione in Raycast in modalità sviluppo
```

Al primo avvio Raycast chiede le preferenze: **Email**, **Auto-lock** (default 15 minuti) e **Nome dispositivo**. Il server è fisso (`https://passig.igsolutions.it`) e non configurabile.

`pnpm typecheck` esegue `tsc --noEmit`; `pnpm build` (`ray build`) funziona solo su macOS. L'icona in `assets/icon.png` è generata con `pnpm gen-icon` (script zero-dipendenze in `packages/client-core/scripts/gen-icon.mjs`).

## Flusso di sblocco

1. Primo utilizzo: `POST /auth/prelogin` → derivazione Argon2id della master password → `POST /auth/login` → sblocco di `userKey` e `privateKey` → `GET /vaults` + item, apertura delle `vaultKey` con sealed box e decifratura in memoria.
2. Sblocchi successivi (dopo l'auto-lock): se esiste un refresh token viene riusata la stessa sessione server (`POST /auth/refresh` → `GET /me`) e la master password serve solo a derivare la `stretchKey`; non si crea una nuova sessione a ogni sblocco.

## Modello di sicurezza e compromessi

Ogni comando Raycast gira in un processo Node separato e di breve durata: non esiste memoria condivisa fra un'invocazione e l'altra e **Raycast non espone il Keychain di macOS**. Per questo:

- **La master password non viene mai salvata.**
- **`LocalStorage` di Raycast (persistente)**: contiene **solo il refresh token** (e il marker hash degli appunti). Da solo non permette di decifrare nulla: senza master password non si ottiene la `stretchKey` e quindi né `userKey` né `vaultKey`. Chi lo rubasse potrebbe però ottenere i blob cifrati; la sessione va revocata da «Sessioni» nel backoffice/app.
- **`Cache` di Raycast con TTL = auto-lock** (default 15 min): contiene lo snapshot della sessione sbloccata, cioè `userKey`, `privateKey` e le `vaultKey` in base64 **in chiaro su disco** (`~/Library/Application Support/com.raycast.macos/extensions/...`), insieme agli item ancora cifrati e all'access token. È il compromesso che consente di non reinserire la master password a ogni comando. Il file è protetto solo dai permessi dell'utente macOS e da FileVault; scaduto il TTL viene cancellato alla prima lettura e si richiede la master password. Chi non accetta questo compromesso può impostare l'auto-lock a 1 minuto o usare **Blocca Passig** dopo l'uso.
- **Appunti**: la password è copiata con `concealed: true` (non finisce nella cronologia degli appunti di Raycast) e viene cancellata dopo 30 s se ancora presente: subito se il processo del comando è ancora vivo, altrimenti dal comando in background (granularità 1 minuto, quindi in pratica entro 30-90 s). Il confronto usa l'hash SHA-256 del segreto, mai il segreto stesso.
- Il server non vede mai titoli, username, password, URL o note (vedi `docs/ARCHITECTURE.md`).

## Limiti e TODO

- Nessun supporto biometrico (Touch ID) per lo sblocco: Raycast non espone LocalAuthentication/Keychain alle estensioni.
- Non è possibile modificare o eliminare elementi esistenti dal comando «Cerca» (solo creazione); si usa l'app macOS/backoffice.
- Il cestino (`includeDeleted`) non è esposto.
- Il filtro pnpm dell'estensione è `pnpm --filter ./apps/raycast …` (il nome `passig` è imposto dallo schema Raycast e coincide con il nome del package root).
