# Finickizer

A browser chooser for [Finicky](https://github.com/johnste/finicky), as a Raycast extension.

Finicky stays the default browser. Links that don't match any rules open the Raycast chooser with your browsers:

- **↵** opens the link in that browser, once.
- **⌘↵** remembers the hostname (`gist.github.com`) for that browser.
- **⌥↵** remembers the apex domain and all its subdomains (`github.com`, `*.github.com`).

Remembered rules become ordinary Finicky handlers, so the next click on a matching link is routed by Finicky directly and Raycast never appears. Your own Finicky config is never edited.

## Setup

1. Install [Finicky](https://github.com/johnste/finicky) 4 and make it your default browser, if it isn't already. Then install Finickizer from the Raycast Store.

   To run it from source instead:

   ```sh
   npm install
   npm run dev   # installs into Raycast; stays installed after Ctrl-C
   ```

2. In Raycast, run **Manage Browsers**. It lists the apps that declare the `http`/`https` URL scheme in their `Info.plist`, the same criterion macOS uses for its default-browser list; ⌘⇧A switches to every installed app, for example to add an AppleScript launcher applet for a browser profile. ↵ adds an app to the chooser or removes it again, ⌘⌥↑ and ⌘⌥↓ change the order. In rules, an app is named the way Finicky expects: by its name when that is plain letters, digits and spaces, otherwise by its bundle id.

3. Run **Patch Finicky Config** and pick a mode (see "Two modes"). It restarts Finicky at the end.

4. Click any link. The first time, Raycast asks whether to allow the deep link to run the command once or always. Choose **Always**.

### What Patch does

| Path | After patching |
| --- | --- |
| `~/.finicky.js` | symlink to `~/.finickizer.js` |
| `~/.finicky.user.js` | your own config, moved here unchanged (a symlink stays a symlink) |
| `~/.finickizer.js` | generated entry config: imports your config and the glue, holds the mode and the rules |

A config that lives at one of Finicky's lower-priority paths (`~/.finicky.ts`, `~/.config/finicky/…`) is not moved; the new `~/.finicky.js` simply outranks it. The generated file's header explains all of this for anyone who opens it later.

Finicky loads the generated file, which looks like this:

```js
import config from "/Users/you/.finicky.user.js";
import finickizer from "/Users/you/.config/raycast/extensions/finickizer/assets/finickizer.js";

export default finickizer(config, {
  mode: "always",
  rules: [
    { match: finicky.matchHostnames("gist.github.com"), browser: "Arc" },
    { match: finicky.matchHostnames(["github.com", /\.github\.com$/]), browser: "Google Chrome" },
  ],
});
```

Run Patch again to switch modes; it regenerates everything except the lines inside `rules`. If the extension's folder moves, after an update or a reinstall, the glue import is repaired by the background run of Reload Finicky Config within a minute. **Unpatch Finicky Config** puts your own config back in charge, moving it back to `~/.finicky.js` if it came from there, and restarts Finicky. It can keep `~/.finickizer.js` around, inactive, so a later Patch picks the rules up again, or delete it.

### Editing your own config

Keep editing it at its new path. Finicky only watches the file it loads, not the files that one imports, so an edit to your config is not noticed by itself. **Reload Finicky Config** fixes that by rewriting the entry file in place. Raycast also runs it in the background every minute, where it only acts if your config, or the glue after an extension update, is newer than the entry. In practice a saved edit is live within a minute, or immediately if you run the command.

Rule saves from the chooser write to the entry file directly, so those are live at once.

### Two modes

In both modes your handlers and the remembered rules are always applied first. The mode only decides what happens to a link none of them routes. Patch Finicky Config lists both, tags the current one, and switches on ↵:

- **For every such link** (default): the chooser opens. `defaultBrowser` is only reached if a handler throws.
- **Only while fn is held**: the chooser opens for fn+click; a plain click goes to `defaultBrowser`, so set that to your everyday browser. fn is used because ⌘, ⌥ and ⇧ change how the source app treats the click.

### How the glue works

Finicky 4 handlers cannot change a URL, and its `rewrite` rules run before every handler. So `finickizer()` appends one rewrite rule that turns a web URL into the Raycast deep link only if none of your handlers and none of the remembered rules would route it, and puts one handler first that sends `raycast:` URLs to Raycast. The check mirrors Finicky's matching for arrays, functions such as `finicky.matchHostnames`, and regexes. Plain wildcard strings like `"example.com/*"` are not mirrored, so prefer `finicky.matchHostnames` or a regex in your own handlers.

## Rules

Rules live inside `rules: [ … ]` in `~/.finickizer.js`, one per line, and are applied after your own handlers. That order means a remembered rule can never override a handler you wrote: the chooser only ever appears for URLs that fell through all of them. To give a rule priority, copy its line into your own config, where it is plain Finicky syntax, and delete it in Manage Rules.

Remembering the same host or domain again replaces its line. **Manage Rules** lists the rules in the order Finicky applies them and lets you delete one (⌃X), change its browser to any browser from your chooser list, or move it up and down (⌘⌥↑ / ⌘⌥↓), which matters when two rules overlap. Every change is live at once, because it is a write to the file Finicky watches.

Do not edit `~/.finickizer.js` by hand. The extension rewrites it and reads it back line by line, relying on the two import lines, the `mode:` line, the `rules: [` / `],` lines and one rule per line, so a changed or reformatted file breaks saving rules. The file says so in its header and carries a `// prettier-ignore` so that a format-on-save does not reflow it. A line in the block that the extension does not recognise shows up in Manage Rules with a warning icon and can be deleted there. If the file does get mangled beyond that, Unpatch with the delete option and Patch again; that costs the remembered rules.

## Not covered

- Browser profiles. Finicky's `Google Chrome:Work` syntax cannot be produced from the app picker. Use a small launcher app per profile and add that to the chooser instead.
- Finicky runs a Babel transform for named regex capture groups on the file it loads, not on imports. If your own config uses `(?<name>…)` groups and they stop working after patching, that is why.

## License

[MIT](LICENSE) © Igor Savchuk
