# Proton Pass Client (Raycast)

A Raycast extension that lets you use **Proton Pass via the official Proton CLI** — keeping everything **local and private** on your machine.

---

## Features

- **Browse & search** your Proton Pass vault items from Raycast
- **Copy fields quickly** (e.g., username, password, URLs) without leaving your keyboard
- **Fully local workflow**: uses the **Proton CLI** on your machine
- **Supports different item types**: you can copy fields from various item types (e.g., login, password, credit card, identity) directly from Raycast
- (Optional) **Background Refresh**: You can enable/disable automatic updates from the extension preferences
- (Optional) **Web Integration**: If you use the Raycast web extension, the item that matches the current URL will be selected automatically

---

## Installation

### 1) Install Proton CLI

Follow the official Proton instructions to install and log in to your Proton Pass account with the CLI:

- <https://protonpass.github.io/pass-cli/>

Installation in MacOS

```bash
  brew install protonpass/tap/pass-cli

  pass-cli login
```

### 2) Verify it’s available

```bash
  pass-cli vault list
```

### 3) Get the path to the CLI

```bash
  which pass-cli
```

### 4) Set the path in Raycast preferences
