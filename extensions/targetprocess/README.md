# Targetprocess for Raycast

Search Targetprocess items and see your assigned work without leaving Raycast.

## Commands

- **Search Targetprocess** — find user stories, bugs, tasks, features, epics and requests by name, or type an ID
  to jump straight to it. Closed items are hidden by default.
- **My Work** — everything currently assigned to you, grouped by workflow state.
- **Manage Instances** — add, edit and remove the Targetprocess instances you connect to.

## Setup

1. In Targetprocess, open your profile → **Settings** → **Access Tokens** and generate a personal access token.
2. Run **Manage Instances** in Raycast and add your instance: a name of your choosing, the URL you use in the
   browser, and the token.

The connection is checked as you save, and the extension reports back which user the token belongs to.

Tokens are held in Raycast's encrypted local storage, scoped to this extension. Nothing is sent anywhere except
your own Targetprocess instance.

### Which URL?

Whatever you type into your browser — `https://acme.tpondemand.com` for hosted accounts, or something like
`https://tools.example.com/TargetProcess` for on-premise installs. A path prefix is fine, and a pasted `/api/v1`
is trimmed for you.

### Multiple instances

Add as many as you like — production and sandbox, or several clients. A dropdown in the search bar switches
between them, and your choice is remembered.

## Requirements

Targetprocess with the REST API enabled, which is the default. Older on-premise versions work: the extension
uses API v1 throughout and only takes advantage of API v2 where an instance offers it.

## Credits

Entity type icons are from [Lucide](https://lucide.dev), used under the ISC licence. Each bundled file keeps
its licence header; the set is regenerated with `npm run icons`.

## Privacy

The extension talks to your Targetprocess instance and to nothing else. There is no telemetry, no analytics and
no third-party service. Diagnostics output is deliberately structural — entity type names, field names and HTTP
statuses — and never includes your token or the contents of your work items.
