# Third-Party Notices

## LAME 3.100

Meeting Capture bundles the LAME command-line encoder to produce genuine MPEG Layer III files because macOS does not provide an MP3 encoder through its public native audio conversion APIs on the supported machine.

- Project: LAME — LAME Ain't an MP3 Encoder
- Official source: https://downloads.sourceforge.net/project/lame/lame/3.100/lame-3.100.tar.gz
- SHA-256: `ddfe36cab873794038ae2c1210557ad34857a4b6bdc515785d1da9e175b1da1e`
- License: GNU Library General Public License, version 2 (LGPL-2.0)
- Reproducible universal build: `script/build_lame.sh` (arm64 + x86_64)
- Build configuration: static CLI, shared libraries disabled, decoder disabled; the executable remains a separate process and is not linked into MeetingCaptureHelper.

The upstream `COPYING` and `LICENSE` files are retained under `licenses/lame/`. No LAME source modifications are applied.
