# PromptVault Raycast Extension

Browse, search, and use your PromptVault prompts directly from Raycast.

## Features

- **Browse Prompts**: Search and filter your prompts by category
- **Fill Variables**: Dynamic forms for prompts with `{{variables}}`
- **Copy to Clipboard**: One-click copy with confirmation
- **Quick Save**: Create new prompts directly from Raycast
- **Open in Browser**: Jump to the web app for editing

## Installation & Configuration

### Étape 1 : Obtenir une clé API

1. Ouvre PromptVault dans ton navigateur
2. Clique sur ton avatar → **Paramètres**
3. Dans la section **API Keys**, clique **"+ Nouvelle clé"**
4. Donne un nom (ex: "Raycast")
5. **Copie la clé générée** (format `pv_xxxxxxxxxxxx`)
   - ⚠️ Cette clé ne sera affichée qu'une seule fois !

### Étape 2 : Configurer l'extension

1. Ouvre **Raycast** (Cmd+Space)
2. Tape **"Browse Prompts"** ou **"Quick Save Prompt"**
3. L'extension te demandera de configurer :
   - **PromptVault URL** : L'URL de ton instance
     - Local : `http://localhost:3000`
     - Production : `https://promptvault.vibeacademy.eu`
   - **API Key** : Colle la clé `pv_xxxxxxxxxxxx`

### Étape 3 : Utiliser

- **Browse Prompts** : Rechercher et copier tes prompts
- **Quick Save Prompt** : Créer un nouveau prompt rapidement

## Development (pour développeurs)

### Prérequis

- Node.js 18+
- Raycast installé sur macOS

### Setup

```bash
cd apps/raycast
npm install
npm run dev
```

L'extension sera automatiquement chargée dans Raycast en mode développement.

## Commands

| Command | Description |
|---------|-------------|
| Browse Prompts | Search and use your prompts |
| Quick Save Prompt | Create a new prompt |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Fill & Copy (or Copy Raw if no variables) |
| `⌘ + C` | Copy Raw |
| `⌘ + D` | View Details |
| `⌘ + O` | Open in Browser |
| `⌘ + R` | Refresh |

## Development

```bash
npm run dev       # Start development mode
npm run build     # Build for production
npm run lint      # Check code style
npm run fix-lint  # Fix lint issues
```

## API Endpoints Used

- `GET /api/v1/prompts` - List prompts
- `GET /api/v1/prompts/{slug}` - Get prompt detail
- `POST /api/v1/prompts/{slug}/fill` - Fill variables
- `POST /api/v1/prompts` - Create prompt
- `GET /api/v1/categories` - List categories
