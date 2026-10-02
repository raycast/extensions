# League Stats

Look up League of Legends players from Raycast. It shows ranked and recent win rates, match history, and a page for each game with every player's KDA, damage and items.

## Setup

You need a Riot API key.

1. Sign in at [developer.riotgames.com](https://developer.riotgames.com).
2. Copy the development API key and paste it into the extension's preferences.

Development keys expire after 24 hours. When yours does, the extension says so and offers to open the preferences. A personal API key doesn't expire, and you can register one on the same site.

## Preferences

- **Default Region**: used only if a player's region can't be detected automatically.
- **Game Type**: which games to list. Choose All Game Types (the default), Ranked Solo/Duo, Ranked Flex, All Ranked, ARAM, or Normal and Other Modes, which is everything that isn't ranked, including Arena. Riot does the filtering, so "last 20" means the last 20 games of that type.
- **Games to Load**: 10, 20, 30 or 50 games. The default is 20. A Show More Games row at the bottom of the list loads another batch, up to 100 games in total.

## Using it

Run Search Player and type a Riot ID, for example `Hide on bush#KR1`. You can also type it into the command's argument to go straight to the player. Recent lookups are listed under Recent Players.

### Player page

From top to bottom: the profile (level, region), ranked Solo/Duo and Flex (rank, LP, record, win rate), a summary of the loaded games (win rate, KDA, CS per minute), and then the games. Each game shows the champion, KDA, result, queue, length, and date and time. Type a champion, queue or result to filter the games.

- Enter on a game opens the game page.
- ⌘↵ on a game opens that player's stats for it: KDA, kill participation, CS, damage, gold, vision, items with costs, and summoner spells.
- Enter on the summary row opens the average K/D/A, kill participation and most played champions.
- Enter on Show More Games loads more games.
- Enter on the profile and ranked rows reloads the page.

### Game page

One row per player, grouped by team (by placement in Arena): champion, KDA, damage, items and CS. Team headers show kills, gold, damage and objectives. The player you came from is selected.

- Enter opens that player's page.
- ⌘↵ opens their stats for the game.
- ⌘K has Copy Riot ID, Copy Match ID, and links to OP.GG and U.GG.

### Favorites

Press ⌘⇧F on a player to save them, and press it again to remove them. It works on a player's page, in the Recent Players list, and on any player in a game. Saved players get a star on their page.

Search Player lists favorites first. Type part of a name and press Enter. You don't need the tag. Capitals and accents are ignored, so `enistenfb` finds `eniştenfb`.

To open a favorite from Raycast's main search bar, set an alias for Search Player in Raycast's settings. Aliases can only use a-z, digits and spaces. With the alias `lol`, typing `lol enistenfb` and pressing Enter opens that player. If two favorites match, you get the list instead.

Raycast doesn't let extensions add results to its main search bar. To make a name appear there, use Create Quicklink (⌘K on a player's page or a favorite) and confirm it once in Raycast.

### Shortcuts

| Shortcut | Action |
| --- | --- |
| ⌘⇧F | Add or remove a favorite |
| ⌘R | Reload the player page |
| ⌘⇧C | Copy the match ID (player page) |
| ⌃X | Remove a player from Recent Players |
| ⌃⇧X | Clear Recent Players |

## When the data updates

The player page fetches again when you open it and when you press ⌘R. It doesn't refresh on its own while it's open. A game appears once Riot's API has it, so if one you just finished is missing, wait a bit and reload. Finished games never change, so they are saved and reused.

## Limits

- Riot has no lifetime win rate. The ranked figure is this season's ranked record. The other figure is worked out from the games loaded, and remakes don't count.
- A development key allows 20 requests a second and 100 every 2 minutes. Each game costs one request the first time and none after that. A first lookup takes about five requests plus one per game, and Show More Games only pays for the new games. If Riot rate limits you, the games that loaded are shown and Reload tries the rest again. Loading 50 games at once on a development key can hit this.
- Names and images come from Riot's Data Dragon and CommunityDragon. Items use the icon from the patch the game was played on. A queue the extension doesn't know is labeled with its game mode.

## Legal

League Stats isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
