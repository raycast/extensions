<div align="center">
  <picture>
    <img alt="logo" height="128px" src="assets/icon@dark.png">
  </picture>
  <h1 align="center">Zabbix</h1>
</div>

Manage Zabbix Problems, Hosts, Triggers and Latest Data directly from Raycast. Perform common monitoring and maintenance tasks without opening a browser.

> [!NOTE]
> This is not an official Zabbix extension and is not affiliated with, endorsed by, or connected to the Zabbix project in any way.

## Requirements

- Zabbix Server version **7.0** or higher
- A valid Zabbix API token (create one in Zabbix under **User settings → API tokens**)
- The full API endpoint URL ending with `/api_jsonrpc.php` (e.g. `https://zabbix.example.com/zabbix/api_jsonrpc.php`)

The extension supports both **macOS** and **Windows**.

## How to Use

### Add Zabbix Server

On first launch (or via the **Zabbix Server** section in any command), use **Add Server** to configure a Zabbix instance:

- **Name**: Friendly label for the server (shown in the search bar accessory)
- **URL**: Full API endpoint (must end with `/api_jsonrpc.php`)
- **API Key**: The token value (stored securely)

You can add multiple servers and switch between them using the dropdown in the search bar. Edit or remove the current server from the same menu.

### Command: Problems

View current problems (triggers in PROBLEM state).

- Filter problems by **minimum severity** (Not classified → Disaster). The filter is per-server and persisted.
- Toggle **acknowledged** problems visibility.
- **Acknowledge** a problem (with optional message and severity change).
- Drill into **problem items** (latest data).
- Open the **event** directly in the Zabbix web UI.
- Open **history graphs** for the related items.
- **Configure Host**: enable/disable or delete the affected host.
- **Configure Trigger**: change severity or disable the trigger.
- **Create Quicklink (Custom Problems)**: build saved searches with custom filters (host, severity, tags, etc.) that can be launched via Raycast Quicklinks or deep links.

**Keyboard shortcuts** (Problems):

- `⌘⇧U` / `Ctrl+Shift+U` — Update Problem (acknowledge)
- `⌘⇧H` / `Ctrl+Shift+H` — Configure Host
- `⌘⇧T` / `Ctrl+Shift+T` — Configure Trigger
- `⌘⇧L` / `Ctrl+Shift+L` — Show Latest Data (problem items)
- `⌘⇧P` / `Ctrl+Shift+P` — Show Problems (for host)
- `⌘⇧R` / `Ctrl+Shift+R` — Show Triggers (for host)

### Command: Hosts

Browse all monitored hosts with status, host groups, interfaces and trigger counts.

From a host row you can:

- Copy **host name**, **IP** or **DNS**.
- **Show Latest Data** (all items for the host).
- **Show Triggers** for the host.
- **Show Problems** for the host.
- Open the **host** directly in the Zabbix web UI.
- **Configure Host**: enable/disable or delete.

**Keyboard shortcuts** (Hosts):

- `⌘⇧H` / `Ctrl+Shift+H` — Configure Host
- `⌘⇧L` / `Ctrl+Shift+L` — Show Latest Data
- `⌘⇧R` / `Ctrl+Shift+R` — Show Triggers
- `⌘⇧P` / `Ctrl+Shift+P` — Show Problems

### Latest Data (Items) and Triggers

These views are reached from Problems, Hosts, or other items:

- **Items / Latest Data**: current values, copy value with name+unit, open history graph, jump to active problems for the item.
- **Triggers**: list triggers with priority, status and last change; change severity or disable directly; open history graphs.

### Quicklinks & Deep Links

Use **Create Quicklink (Custom Problems)** from the Problems command to persist complex filters (specific hosts, severity, tags, etc.). These can be turned into Raycast Quicklinks for one-click access to tailored problem lists.

Launch context is also supported for automation (e.g. from other extensions or scripts) via `serverUUID` + `params`.

## Common Actions (available in most views)

- Toggle **Detail** view (`⌘⇧Q` or via menu)
- **Refresh** data
- Open related pages in browser (Event, Host, History Graph)
- Copy displayed values (host, problem, IP, DNS, item value, trigger name)
- Manage servers (Add / Edit / Remove) from the action panel
