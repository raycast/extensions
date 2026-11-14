<div align="center">
    <br/>
    <br/>
    <img src="./assets/extension-icon.png" alt="CodePen" width="100"/>
    <h3>CodePen</h3>
    <p>Search, create, and manage your CodePen Pens, collections, and assets from Raycast</p>
    <br/>
    <br/>
</div>

## Setup

1. Open [CodePen Settings → API](https://codepen.io/settings/api) and generate an API key.
2. Open any CodePen command in Raycast and enter the key in the **API Key** preference.
3. Use a personal key (`cp_user_…`) for your own work, or a team key (`cp_team_…`) for that team's work.

Your key is stored as a password preference. The extension sends it only to `https://api.codepen.io/v2/` and does not store API results in a persistent cache.

## Commands

| Command            | What you can do                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search Pens        | Search titles and descriptions; filter by editor, privacy, templates, or deployment; open, preview, copy links, edit metadata, fork, or trash Pens. |
| Create Pen         | Create a 2.0 Pen with CodePen starter files or HTML, CSS, and JavaScript. Choose privacy and tags.                                                  |
| Search Collections | Browse collections and their Pens, edit collection details, or trash a collection. Add a Pen from its action menu.                                  |
| Create Collection  | Create a public or private collection.                                                                                                              |
| Search Assets      | Copy asset URLs, open files, read text source, rename files, or permanently delete assets.                                                          |
| Upload Asset       | Upload a local file up to 30 MB and copy its URL. Requires PRO Asset Hosting.                                                                       |

Within a Pen's actions, use **Browse Source Files** to read or copy source, edit text files, or add a text file. **Browse Versions** opens historical source files read-only. Use **Deploy Pen** to publish the latest successful saved build, or **Take Deployment Down** to remove the hosted deployment.

Pen searches use CodePen's search syntax: words must all match, `"quoted phrases"` stay together, and `-word` excludes a word. The API accepts up to 200 characters. Collections, collection contents, and assets search the loaded items; **Load More** includes another page. Only Pens owned by the API key appear inside a collection, even when it contains other people's Pens.

## API behavior

- The API accesses only work owned by the key's user or team. It cannot search the public community or another person's Pens, including Pens you collaborate on.
- Classic Pens support source viewing and collection membership. Editing, forking, deletion, versions, and deployment actions are available for 2.0 Pens only.
- New items use your account's default privacy unless you choose another option. Non-public access and Asset Hosting require the appropriate CodePen plan. **Private** means unlisted; **Protected** requires a password of at least eight characters. Protected and Collaborators-only previews must be viewed through the authenticated editor.
- File edits create a version and start a build. CodePen may adjust or format the source during compilation. The extension refuses stale edits and edits made while the previous build is running. Refresh the source files before editing again. Existing auto-deploy settings still apply.
- A failed build still saves your files. Check the diagnostics in the Pen details, then correct the source. If a request is interrupted, inspect CodePen before repeating it: the write may already have succeeded.
- Trashed Pens and collections can be restored on CodePen for three days. Deleting a collection keeps its Pens. Asset deletion is permanent. Renaming an asset changes its URL.
- Requests and daily creates count against CodePen's plan allowances. The extension shows API errors and never automatically retries a write.

This release focuses on Pens, source files, collections, and assets. Collaborator management, editor settings, version restoration, and binary Pen-file uploads remain available in CodePen's editor.

## Raycast AI

Use `@codepen` to find your work, read source and build diagnostics, create or edit Pens, fork, deploy, manage collections, and create text assets. Mutations show a confirmation before they run.

Examples:

- “Find my CSS animation demos.”
- “Read the source of my portfolio Pen.”
- “Create a Pen with a responsive card layout.”
- “Add my loading animation Pen to my UI experiments collection.”
- “Create a text asset called theme.css with these styles.”

## Development

```sh
npm install
npm run dev
```

Validation:

```sh
npm run build
npx tsc --noEmit
npm run lint
npm test
npx ray evals -I --exit-on-error -s
```

The test suite uses mocked HTTP responses to exercise API contracts, version conflicts, multipart uploads, privacy, pagination, and uncertain write outcomes. AI evals use the fixtures in `ai.yaml`. Live verification requires your own CodePen key; do not commit it.

Manual smoke test: search an existing Pen, inspect its source, create a small Pen, edit one file, refresh after its build, add it to a collection, and upload a small asset if your plan supports it. Verify Classic Pens expose only supported actions. Deployment and deletion can be checked on disposable content.

## References

- [CodePen API v2](https://blog.codepen.io/docs/api/api-v2/)
- [REST API v2](https://blog.codepen.io/docs/api/api-v2/rest-api-v2/)
- Extension icons use CodePen's official [brand assets](https://blog.codepen.io/logos/) in light and dark variants.
