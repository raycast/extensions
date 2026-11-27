# Pitchfork Daemons

Start, stop and restart [Pitchfork](https://pitchfork.jdx.dev) daemons, read their logs and open their URLs from Raycast or the menu bar.

## Setup

Install Pitchfork 2.30 or newer. The extension finds it in the mise, Homebrew, Cargo and `~/.local/bin` locations; set **Pitchfork Binary** in the extension preferences if yours lives elsewhere.

The extension lists the daemons Pitchfork knows about machine-wide: every daemon it has started at least once, plus those in your global config. Start a project's daemons once from its folder and they show up here from then on.

It never starts the Pitchfork supervisor on its own. When the supervisor isn't running, use **Start Supervisor**; it runs in a login shell so your daemons get your usual environment.
