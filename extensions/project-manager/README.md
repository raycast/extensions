# 🚀 Project Manager - Raycast Extension

Extension Raycast complète pour gérer et ouvrir rapidement tes projets avec ton éditeur de code préféré (Cursor, VS Code, Zed, WebStorm, Sublime Text) et Claude Code.

## ✨ Fonctionnalités

- **Add Project** : Ajoute un nouveau projet avec nom, chemin, éditeur et terminal préféré
- **Open Project** : Ouvre un projet dans ton éditeur de code et/ou Terminal + Claude Code
- **Edit Project** : Modifie les paramètres d'un projet existant
- **List Projects** : Liste tous tes projets avec leurs détails
- **Delete Project** : Supprime un projet de la liste

## 📦 Installation

### Prérequis
- Node.js (v16 ou supérieur)
- npm
- Raycast installé

### Étapes d'installation

1. **Installer les dépendances :**
```bash
cd /Users/maximesaltet/Desktop/All_Projects/cc_raycast
npm install
```

2. **Lancer en mode développement :**
```bash
npm run dev
```

L'extension apparaîtra automatiquement dans Raycast !

## 🎯 Utilisation

### 1️⃣ Ajouter un projet
- Lance **"Add Project"** dans Raycast (⌘ + Espace)
- Remplis :
  - Nom du projet
  - Chemin du dossier (sélecteur de fichiers)
  - Fichier workspace (optionnel) : Sélectionne un fichier `.workspace` pour l'ouvrir directement
  - Éditeur de code (Cursor, VS Code, Zed, WebStorm, Sublime Text)
  - Terminal préféré (Ghostty, iTerm, ou Terminal)
  - Commande Claude Code : La commande pour lancer Claude Code (par défaut: `cc`)

### 2️⃣ Ouvrir un projet
- Lance **"Open Project"** dans Raycast
- Cherche ton projet dans la liste
- Choisis une action :
  - **Open Both** : Ouvre ton éditeur + Terminal + Claude Code
  - **Open in [Editor] Only** : Ouvre uniquement ton éditeur
  - **Open in Terminal + Claude Code** : Ouvre uniquement le terminal avec cc
- Raccourci : **⌘ + E** pour éditer le projet

### 3️⃣ Éditer un projet
- Lance **"Edit Project"** dans Raycast
- Sélectionne le projet à modifier
- Modifie ses paramètres (nom, chemin, workspace, éditeur, terminal)
- Sauvegarde les changements

### 4️⃣ Lister les projets
- Lance **"List Projects"** pour voir tous tes projets avec :
  - Icône 📄 si workspace configuré
  - Badge vert : éditeur
  - Badge bleu : terminal
- Raccourci : **⌘ + E** pour éditer depuis la liste

### 5️⃣ Supprimer un projet
- Lance **"Delete Project"**
- Sélectionne le projet à supprimer
- Confirme la suppression

## 🏗️ Structure du projet

```
cc_raycast/
├── package.json           # Configuration de l'extension
├── tsconfig.json          # Configuration TypeScript
├── assets/
│   └── icon.png          # Icône de l'extension (à créer)
└── src/
    ├── add-project.tsx    # Commande: Ajouter un projet
    ├── edit-project.tsx   # Commande: Éditer un projet
    ├── open-project.tsx   # Commande: Ouvrir un projet
    ├── list-projects.tsx  # Commande: Lister les projets
    ├── delete-project.tsx # Commande: Supprimer un projet
    └── utils/
        └── storage.ts     # Gestion du stockage local
```

## 💾 Stockage des données

Les projets sont stockés dans le LocalStorage de Raycast. Format :

```typescript
type EditorType = "cursor" | "vscode" | "zed" | "webstorm" | "sublime";

interface Project {
  id: string;
  name: string;
  path: string;
  editor: EditorType;
  terminal: "ghostty" | "iterm" | "terminal";
  workspaceFile?: string; // Chemin optionnel vers un fichier .workspace
  claudeCodeCommand: string; // Commande pour lancer Claude Code
}
```

### 📄 Fichiers Workspace

Tu peux associer un fichier `.workspace` à ton projet. Quand tu ouvres le projet dans ton éditeur, c'est le workspace qui sera ouvert au lieu du simple dossier. Cela permet de :
- Conserver tes onglets ouverts
- Garder ta configuration d'éditeur spécifique au projet
- Ouvrir plusieurs dossiers en même temps (multi-root workspace)

## 💻 Éditeurs supportés

- **Cursor** : L'éditeur AI-first basé sur VS Code
- **VS Code** : L'éditeur Microsoft le plus populaire
- **Zed** : Éditeur ultra-rapide et moderne
- **WebStorm** : IDE JetBrains pour le développement web
- **Sublime Text** : Éditeur léger et performant

Chaque éditeur peut être configuré par projet, permettant d'utiliser différents éditeurs selon tes besoins.

## 💡 Terminaux supportés

- **Ghostty** : Terminal moderne et rapide
- **iTerm** : Terminal avancé pour macOS
- **Terminal** : Terminal natif macOS

Chaque terminal lance automatiquement Claude Code dans le dossier du projet.

## ⚙️ Commande Claude Code Personnalisable

L'extension permet de configurer **par projet** la commande pour lancer Claude Code. Exemples de commandes possibles :
- `cc` (par défaut) : Si Claude Code est installé avec le CLI standard
- `claude code` : Si tu as installé avec ce nom de commande
- `claude-code` : Variante avec tiret
- `/chemin/absolu/vers/claude-code` : Chemin complet si la commande n'est pas dans le PATH

Cette flexibilité permet d'avoir différentes versions de Claude Code ou différentes installations selon les projets.

## 🔧 Dépendances

- `@raycast/api` : API Raycast pour les extensions
- `@raycast/utils` : Utilitaires Raycast
- `Cursor` : Éditeur de code
- `Claude Code CLI (cc)` : Doit être installé et accessible dans le PATH

## 🛠️ Développement

```bash
# Installer les dépendances
npm install

# Lancer en mode dev
npm run dev

# Build pour production
npm run build

# Linter
npm run lint

# Fix lint automatiquement
npm run fix-lint
```

## 📝 TODO

- [ ] Ajouter une vraie icône PNG (512x512px minimum)
- [x] Ajouter la possibilité d'éditer un projet existant
- [x] Support pour plusieurs éditeurs (Cursor, VS Code, Zed, WebStorm, Sublime Text)
- [x] Support pour les fichiers `.workspace`
- [x] Commande Claude Code personnalisable par projet
- [ ] Ajouter des raccourcis clavier personnalisés globaux
- [ ] Ajouter des tags/catégories pour organiser les projets
- [ ] Recherche avancée avec filtres
- [ ] Import/Export de la configuration des projets
- [ ] Favoris / Projets récents

## 📄 Licence

MIT

---

Créé avec ❤️ pour gérer tes projets rapidement avec Raycast, Cursor et Claude Code !
