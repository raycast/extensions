# Val Town

Browse your [Val Town](https://www.val.town) account from Raycast, and allow Raycast AI to run the vals you choose.

## Setup

Create a token at [val.town/settings/api](https://www.val.town/settings/api) and paste it into the extension's preferences.

## Running vals

**Run Val** (`⌘R`) on any val runs it from Raycast. A val that takes nothing runs immediately; one with inputs gets a form generated from its argument schema.

**Configure Val** (`⌘T`) is that config screen: the entrypoint file to call, and the arguments the val takes as a JSON Schema. With Raycast AI available, `⌘G` reads the entrypoint's code and drafts the schema. Correct anything it got wrong before saving. Nothing changes until you save, and saving never runs the val.

## Raycast command (1):

- **Search Vals**: Browse every val on your account. Run them, or view files, blobs, database, and recent runs, etc.

## AI tools (6, what the model can call):

- **list-tools**: The allowed-and-enabled vals with each one's description and argument schema.
- **execute-tool**: Runs one allowed val with arguments matching its schema.
- **get-val-info**: Reads a val's file listing or one file's source.
- **read-val-blobs**: Lists or reads an allowed val's blob storage.
- **get-val-runs**: An allowed val's last hour of executions with per-run logs and errors.
- **load-skill**: Fetches one of your `SKILL.md` guides by request.

## The allow list

Raycast AI can only see and run vals you have allowed. That is the **Allow AI Access** checkbox on the config screen, or **Enable / Disable AI Agent Access** (`⇧⌘A`) directly. Running a val yourself never needs it. **Require Confirm** (`⇧⌘C`) makes Raycast AI stop and ask before each run. It's off by default.

Beyond running, Raycast AI can also read an allowed val's files and blobs, and check its recent runs and failures. All on your request.

## Load skills

You can ask Raycast AI to load a skill of yours: a `skills/<name>/SKILL.md` file (with frontmatter) in any of your vals, whose instructions name vals to run. It searches all skills regardless of allow list, but if the skill mentions a val that is not allowed, Raycast AI will not be able to run it.

## Argument examples

The **Arguments** box on a val's config screen takes a JSON Schema describing the request body the val's http handler reads. Raycast AI sends an object matching it, and the extension `POST`s that object as the body. Leave the box empty and the val is called with `GET` and no body at all.

Give every property a `description`. That is what the model reads when it works out what to pass, and it is the difference between a val the model calls correctly and one it guesses at.

**One required argument:**

```json
{
  "type": "object",
  "properties": {
    "city": { "type": "string", "description": "City to look up, for example Berlin" }
  },
  "required": ["city"]
}
```

**Optional arguments.** Anything left out of `required` is optional, so say what happens without it:

```json
{
  "type": "object",
  "properties": {
    "query": { "type": "string", "description": "Search term" },
    "limit": { "type": "integer", "description": "How many results to return. Defaults to 10." }
  },
  "required": ["query"]
}
```

**A fixed set of choices.** `enum` keeps the model from inventing a value:

```json
{
  "type": "object",
  "properties": {
    "status": { "type": "string", "enum": ["todo", "doing", "done"], "description": "The new status" }
  },
  "required": ["status"]
}
```

**Lists and nested objects:**

```json
{
  "type": "object",
  "properties": {
    "recipients": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Email addresses to notify"
    },
    "message": {
      "type": "object",
      "properties": {
        "subject": { "type": "string", "description": "Subject line" },
        "body": { "type": "string", "description": "Plain text body" }
      },
      "required": ["subject", "body"],
      "description": "The email to send"
    }
  },
  "required": ["recipients", "message"]
}
```

The extension does not check the body against the schema before sending it — the schema steers the model, it does not police it. `required` and `enum` are instructions to Raycast AI, not validation.

## Where a val's settings live

In the **val's own blob storage**, under the key `raycast:tool.json`:

```jsonc
{
  "version": 1,
  "inputSchema": { "type": "object", "properties": {} },
  // the file to call. null finds a runnable file automatically
  "entrypoint": null,
  // Raycast AI specific, null = use val's description
  "description": null,
  // whether Raycast AI is allowed to run this val
  "active": true,
  // stop and ask before running
  "confirm": false
}
```

It lives with the val so it survives forking, sharing, and reinstalling the extension. A missing config fails.

## Where extension state lives

Which vals you allowed are stored as `raycast:tools.json` in your **account-global blob storage**.
