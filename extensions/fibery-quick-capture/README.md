# Fibery Quick Capture for Raycast

Create tasks in Fibery without leaving your keyboard. The extension discovers your workspace databases and fields,
hides deleted databases, and remembers the last destination you used.

## Features

- Create a task in any Fibery database with a writable `Name` field.
- Set text, number, boolean, date, location, select, Owner, and other relation fields.
- Select multiple values for collection fields such as Owners.
- Automatically adapt when your Fibery schema changes.
- Preserve unfinished task forms with Raycast drafts.

## Setup

1. In Fibery, open the workspace menu and choose **API Tokens**.
2. Create a token and copy it. Fibery limits each user to three active tokens.
3. Open **Create Fibery Task** in Raycast.
4. Enter your Fibery workspace name, such as `acme`, or its full `https://acme.fibery.io` URL.
5. Paste the API token into the password preference.

The token has the same workspace permissions as the Fibery user who created it. Only grant that user access to data the
extension should be able to read or modify.

## Use

1. Run **Create Fibery Task**.
2. Enter the task name.
3. Select the destination database.
4. Use **Additional Fields** to add any other values.
5. Run **Save Task** from the Action Panel. The standard submit shortcut is `⌘` `Enter` on macOS or `Ctrl` `Enter` on
   Windows.

Run **Refresh Fibery Schema** from the Action Panel after changing databases or fields in Fibery.

Rich-text fields and date ranges are not currently shown because Fibery requires specialized API operations to populate
them.

## Privacy and Security

- The API token is stored as a Raycast password preference.
- The token is sent only to the configured HTTPS workspace under `*.fibery.io`.
- The extension has no analytics, tracking, advertising, or intermediary server.
- Task data is sent directly from Raycast to your Fibery workspace.
- The extension does not use Keychain access or download executable files.

## Troubleshooting

### A database is missing

The database must be active and have a writable field named `Name`. Run **Refresh Fibery Schema** after making schema
changes.

### A field is missing

Read-only, deleted, rich-text, and date-range fields are not shown. Your Fibery user must also have permission to access
the field.

### Owner options are missing

The API token's Fibery user must have access to the relevant users. Relation selectors currently load up to 100 options.

### Authentication fails

Create a new token from Fibery's **API Tokens** page and replace the token in Raycast's extension preferences. Confirm
that the workspace name matches the subdomain in your Fibery URL.

## Development

Requires Node.js 22.14 or later, npm 7 or later, and Raycast.

```sh
npm install
npm run dev
```

Run `npm run lint` and `npm run build` before publishing.

## Fibery API

The extension uses Fibery's official `POST /api/commands` endpoint:

- `fibery.schema/query` discovers active databases and writable fields.
- `fibery.entity/query` loads relation and select options.
- `fibery.entity/create` creates the task.
- `fibery.entity/add-collection-items` attaches values to collection fields.

Static API tokens use Fibery's `Authorization: Token …` header. See the
[Fibery authentication documentation](https://developers.fibery.com/guides/getting-started/authentication) and
[HTTP API documentation](https://developers.fibery.com/guides/http-api/overview).
