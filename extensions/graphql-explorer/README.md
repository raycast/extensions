# GraphQL Explorer

GraphQL Explorer lets you run GraphQL APIs from Raycast, without opening a browser playground. Save the queries and mutations you use often, attach each one to an environment such as local, staging or production, and run it from Raycast's search bar.

- **Environments**: an environment is an endpoint URL plus the headers sent with every request, such as an `Authorization` token. You can run a saved query against a different environment with one shortcut.
- **Saved queries**: queries and mutations, each with its own icon and color. Search them by name and filter them by environment.
- **Variables**: when a query declares variables, the extension asks for them in a form. If the server allows introspection, the form lists enum values and pre-fills input objects with their required fields.
- **Responses**: pretty-printed JSON with the HTTP status, timing, size and number of GraphQL errors. You can also copy the request as a curl command.

The extension runs on macOS and Windows. Environments, queries and variables are stored in Raycast's local storage. The only network requests go to the endpoints you configure.

## Commands

### Manage GraphQL Environments

An environment is a GraphQL endpoint plus the headers sent with every request. Each header has its own row with a name field and a value field, for example `Authorization` and `Bearer <token>`. Press ⌘N to add a header and ⌃X to remove the header you're editing; both are also in the action panel. Rows left completely empty are ignored when saving.

- Create (⌘N), edit (↵), duplicate (⌘D) and delete (⌃X) environments.
- **Test Connection** (⌘⇧T) sends `{ __typename }` and reports the HTTP status and timing.
- **Clear Cached Schema** (⌘⇧L) drops the cached introspection result.

### Search GraphQL Queries

Each query has a name, an environment, a Font Awesome icon and color, and a GraphQL document. A document can contain several operations and fragments.

- **Run Query** (↵) sends the query to its environment. **Run in Environment…** (⌘⇧R) sends it to a different environment.
- Create (⌘N), edit (⌘E), duplicate (⌘D) and delete (⌃X) queries. You can filter the list by environment from the search bar.
- **Show Details** (⌘⇧D) shows the query with syntax highlighting, along with its operations and variables.
- In the query form, **Preview Query** (⌘⇧P) shows the query with syntax highlighting and **Format Query** (⌘⇧F) pretty-prints it.

On Windows, use Ctrl instead of ⌘.

## Running queries with variables

If the query declares variables, a form asks for them before running:

| Variable type | Input |
| --- | --- |
| `String`, `ID`, custom scalars | text field |
| `Int`, `Float` | text field, validated as a number |
| `Boolean!` | checkbox |
| `Boolean`, enums | dropdown (enums need the schema) |
| lists, input objects, `JSON` scalars | JSON editor (text area validated as you type, ⌘⇧F to format) |

The schema is loaded with introspection and cached for one hour. The extension uses it to:

- list enum values in dropdowns
- pre-fill each JSON editor with a template of the input object's required fields
- show the input object's available fields in the field's info tooltip

If introspection is disabled on the server, field types are inferred from the query instead. The last values you used are remembered for each query.

## Response

The response is shown as pretty-printed JSON, with the HTTP status, timing, size and GraphQL error count. From the response you can:

- copy the whole response or only its `data` field
- **Run Again** (⌘R)
- **Open in Editor** (⌘O)
- **Copy as Curl Command** (⌘⇧U)

## Notes

- Raycast form text areas cannot highlight syntax. Queries are highlighted in the list details, the query preview and the response view.
- Environments, queries and the last-used variables are kept in this extension's Raycast local storage.

## Running from source

You need [Raycast](https://www.raycast.com), Node.js and npm.

```bash
git clone https://github.com/guidone/raycast-graphql-explorer.git
cd raycast-graphql-explorer
npm install
npm run dev
```

`npm run dev` loads the extension into Raycast in development mode and rebuilds it when you change a file. The extension stays in Raycast after you stop the command.

| Script | What it does |
| --- | --- |
| `npm run dev` | Run the extension in Raycast and rebuild on every change |
| `npm run build` | Build the extension |
| `npm run lint` | Check the manifest, icons, ESLint and Prettier |
| `npm run fix-lint` | Fix ESLint and Prettier problems |
| `npm run publish` | Open a pull request that submits the extension to the Raycast Store |

## Issues and contributions

Report bugs and request features in [GitHub issues](https://github.com/guidone/raycast-graphql-explorer/issues). Pull requests are welcome. Run `npm run lint` before you open one.

## License

[MIT](LICENSE)

## Credits

Icons: [Font Awesome Free](https://fontawesome.com) by Fonticons, Inc., licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
