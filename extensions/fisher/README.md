# Fisher Plugin Manager for Raycast

A Raycast extension to help you manage your Fish shell plugins with [Fisher](https://github.com/jorgebucaran/fisher).

## ✨ Features

- 🔍 **Search & Install Plugins** – Browse from a curated registry and install with one click
- 📦 **List Installed Plugins** – View all installed plugins with descriptions
- 🔧 **Update Plugins** – Update individual plugins or all at once
- ❌ **Remove Plugins** – Easily remove plugins with confirmation
- 📄 **Plugin Details** – View descriptions, GitHub links, stars, and last updated date

## 📦 Plugin Metadata

Plugin info is powered by a local JSON registry that you can update manually. It includes name, description, and GitHub repo.

## 🛠️ Setup (Optional for Development)

To increase GitHub API rate limits during development:

1. Create a `.env` file in the project root:

   ```bash
   GITHUB_TOKEN=your_personal_token_here
   ```

2. Install dependencies:

   ```bash
   npm install dotenv
   ```

3. On `PluginDetail` component:

   ```bash
     const headers = {
         Authorization: `Bearer process.env.GITHUB_TOKEN`,
         Accept: "application/vnd.github+json",
     };

     const [metaRes, relRes] = await Promise.all([
       fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
       fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, { headers }),
     ]);
   ```

The extension uses this token to authenticate GitHub API requests when available.

## 🔒 Notes

- Core plugin `jorgebucaran/fisher` is protected from accidental removal.
- Cached metadata is stored locally and refreshed every 24 hours.

## 📷 Screenshots

<img src="metadata/fisher-1.png" width="600" />
<img src="metadata/fisher-2.png" width="600" />
<img src="metadata/fisher-3.png" width="600" />

---

Made with ❤️ for Fish & Raycast

---

> Want to contribute? Submit a PR with new plugins for the registry!
