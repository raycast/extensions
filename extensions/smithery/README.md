# Smithery for Raycast

Search and install [Smithery](https://smithery.ai) MCP servers and AI skills directly from Raycast. Browse 3,500+ Model Context Protocol (MCP) servers, discover AI skills, and manage what's installed across all your AI clients — without leaving your keyboard.

## Features

- **Search MCP Servers** — Find and install MCP servers from the Smithery marketplace into any supported client
- **Search Skills** — Discover AI skills with quality scores and verification status
- **Manage Installed** — View and uninstall MCP servers across all your clients from a single place

## Prerequisites

This extension requires the **Smithery CLI** to be installed and available on your `PATH`.

### Install the Smithery CLI

```bash
npm install -g @smithery/cli
```

Verify the installation:

```bash
smithery --version
```

If `smithery` is not found after installation, ensure your npm global bin directory is on your PATH (e.g., `/usr/local/bin` or `$(npm prefix -g)/bin`).

> **Homebrew users:** The CLI is also available via Homebrew. Check [smithery.ai](https://smithery.ai) for the latest install instructions.

## Usage

### Search MCP Servers

Search over 3,500 MCP servers from the Smithery marketplace. When no query is entered, popular servers are shown ranked by usage. Select a server to view its details, tools, security scan, and connection type, then use **Add to Client** to install it.

### Search Skills

Browse AI skills with quality scoring and verification badges. Skills are ranked by activations and quality score. Use **Add to Agent** to install a skill into a supported AI agent.

### Manage Installed

View all MCP servers installed across your configured clients. Filter by client using the dropdown, and use **Uninstall from Client** to remove a server.
