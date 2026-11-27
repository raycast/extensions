# Glancecard for Raycast

**Your GitHub profile and repositories, at a glance.** See any profile or public repository as a [glancecard](https://gfazioli.github.io/glancecard/) in every look, right in Raycast: pick one, copy or save the SVG, and put the card in your README with the free GitHub Action that keeps it fresh every day.

![glancecard: your GitHub, at a glance](media/glancecard-cover.png)

[glancecard](https://github.com/gfazioli/glancecard) is a free, open source GitHub Action that draws SVG cards of your profile and your repositories for your READMEs: no server, no third-party service, no dependencies. This extension draws the same cards with the same code, so what you see in Raycast is what your README will show.

## Commands

### Profile Card

Your profile's card, or any user's by login, in all of glancecard's 25 looks at once, drawn from the profile's own data: the classics, their light sides, the terminal's Phosphor tubes and Printout papers, the Workbench, and Halloween and Christmas. Followers, stars and their history, pull requests, issues, a year of contributions, the most starred repositories and their languages.

![A profile card](media/glancecard-profile-card.png)

- **↵** shows the card at full width; **⌘T** turns it to its other side, a dark look's light one and back.
- **⌘Y** opens it in Quick Look, as large as your screen, and **⌘O** in your browser.
- **Copy SVG**, **Copy SVG File** to paste in Finder, Slack or Figma, and **Save to Downloads**.
- **Year** (a line of daily counts or GitHub's calendar), **Stars** (steps, smooth or bars) and, on a repository, its **Sections**: every view redraws as you choose.

### Repository Card

Your repositories, most starred first, or any public repository on GitHub as you type (GitHub does not list the contributors of the very largest, so those have no card) (`owner/name` opens one at once), with the same looks and actions. A repository's card shows commits in the last 30 days, twelve stat tiles, a year of commits with its streaks, the stars over its whole life, the weekly rhythm, languages and essentials, the latest commits and releases, contributors.

### Set up Glancecard

Where glancecard stands on your GitHub: your profile repository, the workflow and the version it runs, Dependabot, the last run and the cards it wrote.

- **No workflow yet**: pick the cards, the looks, the time zone and the hour, and get the workflow and Dependabot as GitHub pages filled in for you to commit, the README embeds copied for you to paste, or a prompt to paste into Claude Code or Codex that does it all.
- **A workflow already**: open a card and use **Use on GitHub**. Only that card changes: it joins the step that already draws it that way, or a new one written like yours, and your other steps, comments and pins stay as they are. You see the change as a diff, and the card's embed.

## Ask `@glancecard`

In Raycast AI:

- "How many stars did gfazioli/octoscope get in the last 30 days?"
- "What are the busiest weekday and hour on gfazioli/glancecard, and how long is its streak?"
- "Compare torvalds' and my contributions over the last year."

Every tool only reads.

## Sign in

You need a GitHub account. Sign in with GitHub when the extension asks, or set a personal access token in the preferences: it needs no scope. The extension reads public data only, the same a card publishes, and writes nothing on GitHub: every change is a GitHub page you commit yourself. The star histories are kept on your Mac between reads, as the Action keeps them, so after the first read of a profile a read costs a request per repository.

## Preferences

- **Personal Access Token**: instead of signing in.
- **Time Zone**: the zone the calendar and the weekly rhythm are read in. Empty: your Mac's.

## Links

- [glancecard's website](https://gfazioli.github.io/glancecard/), with every look and the setup editor
- [glancecard on GitHub](https://github.com/gfazioli/glancecard) and on the [GitHub Marketplace](https://github.com/marketplace/actions/glancecard)
- [glancecard on Product Hunt](https://www.producthunt.com/products/glancecard)
- [Sponsor the author](https://github.com/sponsors/gfazioli)
