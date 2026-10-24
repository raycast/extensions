# RAM Monitor

A little ring in your Mac's menu bar that shows how much RAM you're using. It fills up as memory fills up, and turns green, yellow, or red with macOS memory pressure. Click it to see which apps are eating your memory.

![RAM Monitor menu](media/menu.png)

## Why I built this

I use a MacBook Air with 8 GB of RAM, and most of it is taken almost all the time. I kept wondering which apps were actually using it, and opening Activity Monitor every time got old fast. I wanted something I could glance at.

I was also getting back into coding after a break, and I wanted a real project to learn from instead of another tutorial. This is that project, and it's the first one I've finished from start to end.

## What it does

- **A usage ring** in the menu bar that fills from 0 to 100% as your RAM fills up
- **Pressure colors:** green, yellow, or red, using the same memory pressure signal macOS uses
- **Top apps:** the 10 apps using the most memory. Hover one to see all of its processes
- **Other and System:** smaller apps go into **Other**, and background processes go into **System**, so the menu stays short
- **Sizes you can read at a glance**, in MB or GB
- **A shortcut to Activity Monitor** for when you need the full picture
- **Updates by itself** every 20 seconds

## How it works

### Why not just use "free memory"?

That was my first try, and it said my RAM was 99% used. 😅 It turns out macOS fills spare RAM with cache on purpose, because empty RAM is wasted RAM. That cache can be thrown away any time an app needs the space, so "free" memory is almost always close to zero.

So RAM Monitor reads `vm_stat` and adds up memory the same way Activity Monitor does:

```
Used = (Anonymous − Purgeable) + Wired + Compressed
```

| Activity Monitor | `vm_stat` line |
|---|---|
| App Memory | Anonymous pages − Pages purgeable |
| Wired Memory | Pages wired down |
| Compressed | Pages occupied by compressor |

`vm_stat` counts memory in pages, not bytes. The page size is read from its first line, so the math works on both Apple Silicon (16 KB pages) and Intel Macs (4 KB pages).

### Memory pressure

The ring's color comes from `sysctl -n kern.memorystatus_vm_pressure_level`:

| Level | Meaning | Color |
|---|---|---|
| 1 | Normal | Green |
| 2 | Warning | Yellow |
| 4 | Critical | Red |

### Grouping apps

Apps like browsers run lots of helper processes, so a plain list of processes is messy. RAM Monitor takes every process from `ps` and groups it by the `.app` in its path, so all of an app's helpers count toward that app. Anything without an `.app` goes into **System**. Apps using less than 10 MB in total are hidden.

## A note on accuracy

The overall percentage uses the same method as Activity Monitor and should be close.

The per-app sizes are a bit different. They come from `ps`, which reports **RSS** (resident memory). RSS counts shared memory in every process that uses it, while Activity Monitor's Memory column uses each process's memory footprint. So per-app numbers won't match exactly. Making them match is next on my list.

## Requirements

- macOS
- [Raycast](https://www.raycast.com)

## Run it yourself

```bash
npm install
npm run dev
```

Then open Raycast and run **RAM Usage**.

```bash
npm run lint    # check code and metadata
npm run build   # production build
```

## What's next

- Per-app sizes that match Activity Monitor
- App icons next to each app in the menu

## License

MIT
