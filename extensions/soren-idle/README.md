# Soren Idle

An idle game that lives in Raycast. You crashed on **Soren**, an alien world. Salvage the wreck,
build a base, make contact with the **Sorenians**, and learn to survive.

Pick a task and it keeps running, even with Raycast closed. Come back later and collect the haul.

## Features

- **Fifteen skills, level 1 to 99:** Salvaging, Mining, Foraging, Cooking, Engineering, Fabrication, Combat,
  Hydroponics, Xenochemistry, Xenofishing, Smelting, Hacking, Exploration, Companions and
  Stargazing, on a RuneScape-style XP curve.
- **Resource nodes and mastery:** gathering works a node that runs out and respawns, and every
  repeatable task builds its own mastery for more yield and speed.
- **A base to build:** Workshop, drones, a Hydroponic Bay and a Signal Beacon that calls the locals.
- **Trade and Bounties:** the Sorenians buy what you produce and sell what you can't make yourself.
- **Rescue and Starlight:** build the Rescue Ship, launch off Soren and start over with Starlight
  for permanent perks. Each run is harder and pays better. Pick run modifiers (Brutal Wilds, Slow
  Going, Thin Pickings) for a tougher run that pays extra Starlight.
- **Collection Log:** every item, creature and building you have found, 18 achievements that pay
  Credits, and one rare pet for each skill that runs tasks (about 1 in 10,000 tasks, +3% XP, sent home on each launch).
- **Away report:** per-skill time, tasks, XP per hour and levels gained while you were gone.
- **Settings:** compact numbers (12.4K), a notification toggle for each event, and save backup.
- **Combat:** areas, bosses, a damage triangle and gear that only counts while worn.
- **Menu bar ticker (macOS):** keeps the game running in the background, shows the current task and
  its progress, lets you switch to a recent task or stop it, and notifies you when something happens.

## Commands

| Command               | Platforms | What it does                                                                                         |
| --------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| **Play Soren Idle**   | macOS     | The game: pick tasks, craft gear, manage your base, trade and hunt.                                  |
| **Soren Idle Ticker** | macOS     | A menu bar status that keeps the game ticking, shows task progress, switches tasks and notifies you. |

## Getting started

1. Open **Play Soren Idle** in Raycast.
2. Pick **Salvaging**, then _Hull Scrap_. Levels unlock new tasks.
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
_Copy Save to Clipboard_ (in Settings) to back it up, and _Import Save from Clipboard_ to restore it.

## License

[MIT](LICENSE)
