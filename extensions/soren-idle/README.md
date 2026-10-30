# Soren Idle

An idle game that lives in Raycast. You crashed on **Soren**, an alien world. Salvage the wreck,
build a base, make contact with the **Sorenians**, and learn to survive.

Pick a task and it keeps running, even with Raycast closed. Come back later and collect the haul.

## Features

- **Eight skills, level 1 to 99:** Salvaging, Mining, Foraging, Cooking, Engineering, Combat,
  Hydroponics and Xenochemistry, on the same XP curve as Melvor Idle.
- **Resource nodes and mastery:** gathering works a node that runs out and respawns, and every
  repeatable task builds its own mastery for more yield and speed.
- **A base to build:** Workshop, drones, a Hydroponic Bay and a Signal Beacon that calls the locals.
- **Trade and Bounties:** the Sorenians buy what you produce and sell what you can't make yourself.
- **Combat:** areas, bosses, a damage triangle and gear that only counts while worn.
- **Menu bar ticker (macOS):** keeps the game running in the background and notifies you when a task
  stops.

## Commands

| Command | Platforms | What it does |
| --- | --- | --- |
| **Play Soren Idle** | macOS | The game: pick tasks, craft gear, manage your base, trade and hunt. |
| **Soren Idle Ticker** | macOS | A menu bar status that keeps the game ticking and notifies you when a task stops. |

## Getting started

1. Open **Play Soren Idle** in Raycast.
2. Pick **Salvaging**, then *Scavenge Hull Scrap*. Levels unlock new tasks.
3. Use Engineering to build your Base, and the Signal Beacon to call the Sorenians.
4. Optional: enable **Soren Idle Ticker** so the game keeps ticking in the menu bar.

### Tips

- **Gathering** (Salvaging, Mining, Foraging) hits a node with health. When it runs out you wait for
  it to respawn before the task goes on.
- **Mastery** adds one node health per level, makes a task faster every ten levels, and gives bonus
  yield at 25, 50, 75 and 99.
- **Combat** damage triangle: kinetic beats bio, bio beats energy, energy beats kinetic.
- Reaching level 99 in one skill takes roughly 120 hours of nonstop play with bare hands, less with
  tools and potions.

## Your save

Progress is stored in Raycast's local storage, on your machine only. Nothing is sent anywhere. Use
*Copy Save to Clipboard* to back it up.

## Development

Requires Node.js and [Raycast](https://www.raycast.com).

```
npm install
npm run dev        # load the extension into Raycast
npm test           # engine tests
npm run balance    # time-to-level and time-to-unlock table
npm run lint
```

| Path | What it holds |
| --- | --- |
| `src/engine` | The game logic. No Raycast dependencies, so it is fully unit tested. |
| `src/engine/data` | Game content: items, tasks, buildings, areas, bounties, trade. |
| `src/play.tsx`, `src/screens.tsx` | The Play command: a main menu and the screens it pushes. |
| `src/hooks/use-game.ts` | Loads the game and keeps it ticking. |
| `src/views` | The content of each screen (tasks, inventory, base, equipment, trade, ...). |
| `src/art` | The blue HUD scene art: one scene per task, a camp, and every Base building. |
| `src/ticker.tsx` | The menu bar command. |
| `scripts` | Tooling such as the balance simulation. |

## Releasing

See [RELEASING.md](RELEASING.md).

## Contributing

Issues and pull requests are welcome. Please run `npm test` and `npm run lint` before opening a PR.
Game content lives in `src/engine/data`, and `npm run balance` shows how a change affects pacing.

## License

[MIT](LICENSE)
