# Dolibarr

Search companies and contacts in your Dolibarr ERP and review their proposals, orders and invoices —
without leaving Raycast.

## Requirements

- A Dolibarr instance with the **REST API module enabled** (Setup → Modules → Web services API REST)
- An **API key**, found on your own user card under the *API key* tab

## Setup

On first launch Raycast asks for two values:

| Preference | Example |
|---|---|
| **Dolibarr URL** | `https://dolibarr.example.org` — just the instance address, the extension appends `/api/index.php` itself |
| **API key** | The key from your user card |

A third, optional preference controls **number and date formatting** (German, US, British or your
system setting). It is independent of the interface language, which is always English — a German
user can read an English interface but still wants `7.980,00 €`.

If something does not work, run the **Check Connection** command. It distinguishes an unreachable
address, a URL pointing at the web interface instead of the API, and a rejected key — three cases
that otherwise look alike.

## Commands

### Search

Type any part of a name, email address or phone number. Companies and contacts appear in separate
sections, ranked by how well they match. Diacritics are ignored in both directions: `muller` finds
*Müller GmbH*, and `Müller` finds `info@mueller.de`.

The whole customer base is held in a local index, so results appear instantly. The index refreshes
in the background every time the command opens.

| Key | Action |
|---|---|
| `↵` | Open the company (or the contact's company) |
| `⌘↵` | Open the record in Dolibarr |
| `⌘⇧C` | Copy email address |
| `⌘⇧P` | Copy phone number |

### Company view

Contacts first, then proposals, orders and invoices. `⌘I` toggles a detail pane whose content
follows the selected row — master data and notes for the company, phone numbers for a contact,
amounts and deadlines for a document.

Documents carry a derived state that Dolibarr's status code alone does not show:

| Badge | Meaning |
|---|---|
| **Overdue** | Invoice past its payment deadline |
| **Expired** | Proposal past its validity date |
| **To bill** | Order delivered but not yet invoiced |

`↵` on a document shows its line items; `⌘Y` previews the PDF — Quick Look on macOS, the default
application on Windows, where the shortcuts use `Ctrl` throughout.

### Contact view

Opened with `↵` on a contact. Shows position, department, phone numbers, email and notes.

`↵` calls the landline, `⌘↵` the mobile — and if a contact has only one number, it moves to `↵`.
An action pointing at a missing field is never offered.

### Check Connection

Verifies the URL and API key against the instance and reports the Dolibarr version.

## AI tools

With Raycast AI enabled, four tools answer questions directly:

| Tool | Example question |
|---|---|
| `search-dolibarr` | "Find Müller in Dolibarr" |
| `company-overview` | "What is open at Example GmbH?" |
| `recent-documents` | "What are the latest orders?" |
| `open-items` | "What do I need to follow up on?" |

When several companies match a name, the tools return the candidates instead of guessing — naming
the wrong customer would produce wrong figures.

**Note on data:** Answering a question means sending the tool's result to the AI provider. Company
names, amounts, document references and email addresses leave your machine that way; notes, phone
numbers and addresses do not, because no tool returns them. Removing the `tools` entry from
`package.json` disables the AI tools while leaving both commands fully functional.

## What this extension does not do

It is read-only. Nothing is created, changed or deleted in Dolibarr.
