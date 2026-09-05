# Raccoon

Read the state of your Mac from Raycast, and put right what is wrong without
leaving the list.

Raccoon is a macOS companion toolkit. This extension is its front end: twenty-one
commands, each with a view built for what that command actually reports.

## What you get

Every list is grouped and ordered by what you came for, and colour means the
same thing in all of them:

|        |                           |
| ------ | ------------------------- |
| red    | needs doing now           |
| orange | deserves attention        |
| green  | in order                  |
| grey   | information, no judgement |

`git` ranks repositories by where the work exists rather than how much there is,
so two commits that were never pushed outrank four hundred uncommitted files.
`ssh` ranks keys by what the finding costs: a private key with no passphrase is a
credential in plain text, and it comes before one with loose permissions.
`backup` says whether this Mac is backed up in its first line.

## Two keystrokes

**Enter** resolves the row under the cursor. **Cmd+Enter** resolves everything on
screen. What that means differs per command, because the commands differ:

|                | Enter                             | Cmd+Enter                          |
| -------------- | --------------------------------- | ---------------------------------- |
| Security Audit | apply that one fix                | fix everything shown               |
| Memory         | quit that process                 | quit the listed ones               |
| Ports          | close that port                   | close the reachable ones           |
| Startup        | stop that login item or agent     | stop all of that kind              |
| Wi-Fi          | forget that network               | forget all but the one you are on  |
| Environment    | remove that dangling symlink      | remove all of them                 |
| Certificates   | remove that expired certificate   | remove every expired one           |
| Git            | push that clean repository        | push every clean one               |
| SSH            | add a passphrase, fix permissions | fix every key that needs it        |
| Xcode          | delete DerivedData                | that, and shut the simulators down |
| Trash          | empty it                          | the same; there is one trash       |

Where nothing is put right by a command — battery, disk, network, backup, fonts,
PATH overlaps — both keystrokes open the one place the setting actually lives.

Anything that changes the machine asks first and shows the exact command. It then
runs in Terminal rather than silently: several of these need administrator
rights and Touch ID has nowhere to prompt behind a Raycast view, a command that
fails should fail where you can read why, and an action that removes something
should leave a record of what it removed.

## Setup

This extension drives the `rcc` command-line tool. Install it once:

```sh
brew install thousandflowers/raccoon/rcc
```

The extension finds `rcc` in the usual Homebrew locations. If yours lives
somewhere else, set the **Raccoon CLI** preference to its full path.

## Administrator rights

The security audit and its fixes need root. Rather than a Touch ID prompt per
command, run **Configure Admin Session** once: it installs a `visudo`-checked
sudoers drop-in, and the **Admin Session** preference decides whether it lasts
sixty minutes or until restart.

## Links

- [Raccoon on GitHub](https://github.com/thousandflowers/Raccoon)
