# Spellbook

Your parameterized shell command library for Raycast. Save the commands you keep re-typing with parameters that carry **default values**, find them instantly, and either run them as-is or override any parameter right before execution.

## Why

Shell history is where commands go to be lost. Quicklinks can't execute shell, Snippets only paste text, and Script Commands need a file per command with no argument defaults. Spellbook gives you: save once → find in 2–4 keystrokes → Enter to run with defaults → or one more keystroke to tweak a parameter.

## Placeholder syntax

Parameters live inline in the command string:

| Syntax | Meaning |
| --- | --- |
| `{{name}}` | Required — running always prompts for it |
| `{{name=default}}` | Optional with a default (spaces and `=` allowed in the default) |
| `{{name=a\|b\|c}}` | Choice list rendered as a dropdown; the first option is the default |
| `\{{` | Literal `{{` (for the rare Go-template collision like `{{end}}`) |
| `\}` / `\|` | Literal `}` or `\|` inside a default (e.g. `{{body={"a":1\}}}`) |

Go-template syntax such as `docker ps --format "{{.Names}}"` passes through untouched — placeholder names must start with a letter or underscore.

Examples:

```
git log --graph --oneline -n {{count=25}} {{branch=main}}
ssh -p {{port=22}} {{user=deploy}}@{{host}}
docker logs -f --tail {{lines=100}} {{container=api|worker|db}}
```

Substituted values are shell-quoted automatically when they contain anything beyond safe characters (words starting with `=` or `~user` are quoted too, since zsh would expand them). Values starting with `~/` are deliberately left bare so the shell still expands them to your home directory. The override form always shows the exact final command before you run it, and a repeated `{{name}}` shares one value across all occurrences.

## Usage

- **Search Commands** — the hub. Each command remembers its **last-used parameter values and last-used action**, so Enter repeats exactly what you did last time: if you last ran it, Enter runs it again with the same values; if you last copied it, Enter copies it again. The list subtitle always shows the exact command Enter will produce. Cmd+Enter opens the override form prefilled with the last-used values (defaults fill anything untouched); a "Run with Default Values" action ignores the memory when you need the pristine template. If a required parameter has never been filled, Enter opens the form focused on it. Cmd+D toggles a preview pane with the resolved command and a parameter table (including last-used values). Cmd+Shift+C copies the resolved command, Cmd+Shift+V pastes it into the frontmost app, Cmd+E edits, Cmd+N creates, Ctrl+X deletes.
- **Save Command** — capture a new command. The template is prefilled from your clipboard when it looks like shell. Parameters are detected live as you type.

### Run modes

- **Inline** — output streams into a Raycast detail view with the exit code; Cmd+R re-runs.
- **Terminal** — the command is sent to Terminal.app or iTerm2 (choose in preferences). Use this for anything interactive or long-running (`ssh`, `docker logs -f`, `top`); inline runs are killed when the view closes.

### Safety

Commands matching destructive patterns (`rm -rf`, `sudo`, `dd of=`, forced pushes, `DROP TABLE`, piping downloads into a shell, …) require a confirmation dialog that shows the fully substituted command. Quoting protects against accidental word-splitting, but you author both templates and values — review what the preview shows.

## Storage

The library is a human-editable JSON file at `~/.config/spellbook/commands.json` (change the path in preferences — point it at your dotfiles repo and git becomes your sync layer). External edits are picked up on the next launch or with Reload Library (Cmd+R). Frecency ranking and per-command last-used values/actions are stored locally by Raycast and intentionally kept out of the file, so the synced library stays clean.

The first inline run captures your login shell environment (so Homebrew paths work) and caches it; use **Refresh Shell Environment** after changing your PATH.

## Development

```
npm install
npm run dev      # live development in Raycast
npm test         # parser/danger/library unit tests
npm run lint
npm run build
```
