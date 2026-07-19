# Tenant Lookup

A Raycast extension to convert an Orion **tenant name → UUID** or **UUID → name**, instantly, from Raycast.

Unlike a hardcoded list, this reads the tenant mapping from a **live-updatable source** — a local JSON file and/or a private S3 object. When it reads from S3 it uses **your own AWS SSO session**, so no credentials or secrets are ever bundled into the extension.

---

## 📤 How to send this to a friend / teammate

Share this whole section with them — it's everything they need.

### 1. Prerequisites

- **[Raycast](https://raycast.com)** installed.
- **[Node.js](https://nodejs.org)** 18+ (`node --version`).
- **Only if you'll read tenants from S3:** the **AWS CLI** with our SSO profile configured (the same one you use for day-to-day AWS access). If you only use a local file, you don't need AWS at all.

### 2. Install & run

```bash
# clone the company extensions repo (skip if you already have it)
git clone git@github.com:OrionSecurity/extensions.git
cd extensions/tenant-lookup

npm install
npm run dev        # builds it into Raycast and keeps it live
```

After `npm run dev`, the command **“Tenant Lookup”** appears in Raycast. You can leave `npm run dev` running while you use it; once it has been built, it stays installed in Raycast even after you stop the dev process.

### 3. Point it at a data source (one-time)

Open the extension’s preferences in Raycast (`⌘ ,` while it’s selected) and pick a **Data Source**:

| Data Source | What it does | What you need to set |
| --- | --- | --- |
| **Local file, fall back to S3** *(default)* | Uses your local file if present, otherwise pulls from S3 | `Local File Path` and/or the S3 fields |
| **Local file only** | Reads only a JSON file on your disk | `Local File Path` (e.g. `~/tenants.json`) |
| **S3 only** | Always pulls the shared copy from S3 | `S3 Bucket`, `S3 Key`, `AWS Profile`, `Region` |

Defaults are pre-filled for the shared S3 copy: bucket `orion-internal-tenant-lookup`, key `tenants.json`, region `us-east-1`, profile `prod-readonly`.

- **Local-file users:** just drop a `tenants.json` somewhere (see the format below) and set the path. No AWS needed.
- **S3 users:** make sure your SSO session is active first:
  ```bash
  aws sso login --profile prod-readonly
  ```
  If the session expires, the extension tells you exactly this command to re-run.

### 4. Use it

Open **Tenant Lookup** in Raycast and type any part of a **name** or a **UUID**:

- `↵` — copy the UUID
- `⌘ .` — copy the name
- there’s also a “Paste UUID” action to paste straight into the frontmost app
- `⌘ R` — reload the data

That’s it. 🎉

---

## 🔄 Keeping the shared data fresh (maintainers)

The extension just reads a JSON file shaped like this:

```json
[
  { "uuid": "d589dbf0-c680-11ef-8d68-797e535264b0", "name": "Orion DEV" },
  { "uuid": "445082b4-ce0f-4bed-803c-bb93636131c5", "name": "Orion" }
]
```

Two helper scripts (in `scripts/`) generate and publish it:

```bash
# 1. Dump the current tenants from MongoDB (customers.tenant_id / customers.name)
MONGO_URI='mongodb+srv://…' DB='<database>' ./scripts/dump-tenants.sh
#   -> writes tenants.json

# 2. Upload it to the shared S3 bucket (needs write access, e.g. prod-admin)
PROFILE=prod-admin ./scripts/upload-tenants.sh tenants.json
```

The real `tenants.json` is **git-ignored** — only `tenants.sample.json` is committed. Re-run these whenever tenants change; users pick up the update on their next reload (`⌘ R`).

---

## 🔐 Why this is safe to share

- **No secrets in the extension.** The only thing that touches the database is `dump-tenants.sh`, run manually by a maintainer under their own credentials.
- **S3 access is per-person.** Reading from S3 uses each user’s own AWS SSO identity — access is governed by IAM, and revoking someone is just removing their AWS access.
- **The mapping is internal, low-risk data** (tenant names ↔ UUIDs), not credentials.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| “AWS SSO session is not active…” | Run `aws sso login --profile <profile>` and reload (`⌘ R`). |
| “Local file not found” | Check the `Local File Path` preference (use an absolute path or `~/…`). |
| “Expected a JSON array of { uuid, name }” | The source file isn’t in the expected shape — see the format above. |
| Empty list | Confirm the source has data; try `⌘ R` to reload. |
