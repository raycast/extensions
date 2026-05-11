# Qalccast

Interface with [`qalc`](https://qalculate.github.io/) CLI calculator through Raycast.

Wiki: [https://qalculate.github.io/manual/qalc.html](https://qalculate.github.io/manual/qalc.html) (Only basic interactions are supported)

Aliasing this command to `q` or making a shortcut is encouraged.

This command requires `qalc` to work.

You can get `qalc` on [https://qalculate.github.io/downloads.html](https://qalculate.github.io/downloads.html) or by getting `libqalculate` from your package manager.

Due to limitations of Raycast, you must provide the path to `qalc` manually.
To find it, run `which qalc`.

## Examples

```
5 ohm * 200 A = 1 kV
normdist(7; 5) = 0.05399096651
10:31 + 8:30 to time = 19:01
now to utc = "2025-10-02T18:42:12Z"
today - 5 d = "2025-09-27"
52 -> hex = 0x34
```
