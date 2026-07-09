# Local Go Links — Raycast Extension

Open URLs from short aliases stored in a JSON file you own.

**Fully local.** No network calls. No sync. No account. The extension reads
your JSON file from disk at invocation time and resolves the alias entirely
in memory before opening the URL in your default browser.

**Resolver only.** This extension deliberately does one thing: resolve an
alias and open the URL. It never writes the JSON file. Managing the links
(add / edit / delete / browse) is the job of a separate companion app; the
JSON file is the only contract between the two.

## One-time setup

### Create your local go-links file

The default location is `~/go-links.json`. A starter is included at
`examples/go-links.example.json`:

```
cp examples/go-links.example.json ~/go-links.json
```

Or open `~/go-links.json` in your editor and paste:

```json
{
  "short": "https://somefullurl.com",
  "j": "https://jira.com?ticket={0}",
  "other": "https://{0}.otherfullurl.com"
}
```

You can change the file location later in Raycast → Settings → Extensions →
Local Go Links → "Go Links File".

## Run in development mode

From this directory:

```
npm install
npm run dev
```

`npm run dev` runs `ray develop` under the hood. Raycast picks up the extension,
registers the command, and hot-reloads on every save.

Stop dev mode with `Ctrl+C`.

## The command

**Open Local Go Link** (`no-view`): type `alias arg1 arg2`, browser opens.
That's the whole extension.

## Template syntax

| JSON entry | Type `j PROJ-123` | Resulting URL |
|---|---|---|
| `"j": "https://jira.com?ticket={0}"` | one arg | `https://jira.com?ticket=PROJ-123` |
| `"other": "https://{0}.otherfullurl.com"` | one arg | `https://foo.otherfullurl.com` |
| `"gh": "https://github.com/{0}/{1}"` | two args | `https://github.com/user/repo` |
| `"short": "https://somefullurl.com"` | no args | `https://somefullurl.com` |

Placeholders are positional: `{0}` is the first whitespace-separated token
after the alias, `{1}` is the second, and so on. Each argument value is
URL-encoded; the URL template itself is not.

## Errors you might see

| Toast | What it means |
|---|---|
| "Local go-links file not found" | Create the file at the path shown. |
| "is not valid JSON" | Usually a trailing comma or unquoted key. |
| "No local alias 'xyz'" | Add the alias to your JSON file. |
| "needs more arguments" | Type more whitespace-separated values after the alias. |
| "Refusing to open non-HTTP URL" | The resolved URL didn't start with `http://` or `https://`. |

## Build, lint, format

```
npm run build      # bundled production build
npm run lint       # report problems
npm run fix-lint   # auto-fix what can be fixed
```

## Managing your links

The extension never modifies `~/go-links.json`. Browse, add, edit, and
delete links with any tool that writes valid JSON — your editor, `jq`, or
the companion management app. Because the extension re-reads the file on
every invocation, changes take effect immediately with no reload step.

## Roadmap

The extension works end-to-end for personal use. Everything below is
optional — none of it is required for the command to function locally.

### Required before submitting to the Raycast Store

The full guide is at
[developers.raycast.com/basics/publish-an-extension](https://developers.raycast.com/basics/publish-an-extension).
Author handle, categories, changelog, and lint/build are already done.
What remains:

1. **Screenshots.** Capture 1–6 PNGs (2000×1250, 16:10) into a
   `metadata/` folder using Raycast's Window Capture
   (Settings → Advanced → enable "Save to extension's metadata folder").
2. **Submit.** Run `npm run publish` — it authenticates with GitHub
   and opens the PR to `raycast/extensions` for you. Maintainers review
   for guideline compliance — typical turnaround is several days to a
   week.

## Why "Local"?

Many organizations run a "go links" service (Google's internal `go/`,
Trotto, GoLinks.com, etc.) that resolves aliases server-side. This extension
deliberately does the opposite: your aliases live in a single JSON file you
edit yourself, with zero network involvement. The "Local" prefix in the
command title makes the contract visible.
