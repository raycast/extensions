# VerWatch

Search your Craft CMS projects in [VerWatch](https://verwatch.com) from Raycast across all your teams, see where each package stands and start an update run.

## Commands

**Search Projects** lists every project across your teams, with the number of urgent packages in red and outdated ones in orange, and ⌘P switches team. Open a project to see its packages grouped as urgent, outdated and up to date, and from any package you can see every project that uses it. Press ⌘U on a project to start an update run.

**Recent Updates** lists the latest update runs across your teams, with their status and any pull requests waiting for review.

## Signing in

The first time you open a command, Raycast asks you to sign in to VerWatch. Approve the request in your browser and Raycast takes it from there. You can disconnect Raycast at any time in your VerWatch settings, under API / MCP.

If you'd rather not sign in, create a personal API token under Settings → API / MCP in VerWatch and paste it into the extension's API Token preference.

## Requirements

The extension uses the VerWatch API, which comes with the Agency plan, and while VerWatch is in beta, teams without a subscription have it too. Teams without API access don't appear in the extension, and starting an update run needs the owner or member role on the team.
