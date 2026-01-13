# ClickUp Task Creator

Estensione Raycast per creare velocemente task in ClickUp con selezione lista, assegnazione e priorità.

## Funzionalità

- ✅ Selezione lista da dropdown
- ✅ Titolo e descrizione del task
- ✅ Assegnazione task a membri del workspace (opzionale)
- ✅ 4 livelli di priorità (Urgent, High, Normal, Low)
- ✅ Cache automatica per liste e membri

## Configurazione

1. Ottieni il tuo ClickUp API Token:
   - Vai su ClickUp Settings → Apps
   - Genera un nuovo API token

2. Trova il tuo Workspace ID (Team ID):
   - Apri ClickUp nel browser
   - L'URL conterrà il Team ID: `https://app.clickup.com/{TEAM_ID}/...`

3. Configura l'estensione in Raycast:
   - Apri Raycast Preferences → Extensions → ClickUp Task Creator
   - Inserisci API Token e Workspace ID

## Sviluppo

```bash
# Installa dipendenze
npm install

# Sviluppo locale
npm run dev

# Build
npm run build

# Lint
npm run lint
```

## Requisiti

- Raycast
- ClickUp account con accesso API
- Node.js 20+
