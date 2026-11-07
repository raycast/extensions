# Qui

_Qui_ is French for “who”: who's on port 3000?


Inspect listening ports and terminate the processes behind them, right from Raycast.

- Every listening TCP port with its process, project, git branch, uptime and memory
- Runtime and framework detection (Node.js, Bun, Python, Next.js, Astro, Vite, Express, …)
- The chain of processes that started each server
- Terminate (`⌃X`) or force kill (`⌃⇧X`) a process
  - Refreshes every few seconds while open

## Windows

Works on Windows too. Windows can only end a process outright, so there's a single End Process action instead of Terminate and Force Kill, and the working directory, project and git details aren't shown.

## Credits

- Runtime and framework logos: [Simple Icons](https://simpleicons.org/), [CC0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md). Brand logos remain trademarks of their owners.
