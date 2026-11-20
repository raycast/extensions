# Credits and third-party notices

XDR Boost's Swift helper (`swift/Sources/XDRBoostHelper/`) ports code from the projects below. All three
are MIT licensed; their copyright lines and license text follow.

## Headroom — MIT

<https://github.com/fich-l/headroom> · Copyright (c) 2026 fichl · read at commit `6e7c20a`

The primary port source. `EDRView`, the trigger window (`makeTrigger`), the plain-table capture with
an identity-ramp fallback (`plainTable`), the boost write, the 0.5 s layout-change debounce and the
1 s re-assert timer come from its `Sources/Gamma.swift`. The level values (1.19 / 1.38 / 1.56 / 1.75)
are Headroom's.

## xdr-lift — MIT

<https://github.com/Justaboringname/xdr-lift> · Copyright (c) 2026 Yihan Zhu · as read by Headroom at
commit `b9ebadc`

The 1×1 EDR trigger window setup (window level `CGShieldingWindowLevel() + 1`, collection behavior,
corner placement, periodic redraw) and the gamma-table approach, carried over through Headroom. Read
directly as well: its `app/Booster.swift` documents that the transfer table is gamma-encoded (scaling it
by f scales light by about f^2.2), and its light ≤ 0.95 × headroom cap is used in `Booster.write`.

## Illuminate — MIT

<https://github.com/fackelmeyer/illuminate> · Copyright (c) 2026 Jonas Fackelmeyer · as read by
Headroom at commit `6d71603`

Scaling the captured transfer table linearly by the level, and falling back to an identity ramp when
the reading is unusable, carried over through Headroom. Read directly as well: the adaptive curve's
0.6 × headroom share (`BoostCurve.swift`), the per-model peaks (`DisplayProfile.swift`), the EDR
engagement threshold, pause reasons kept as a set (`SuspensionState`), and the M5 Pro / M5 Max check
(`GammaCompatibility`).

## Not used

BrightIntosh (GPL-3.0) was not read and no code from it is included. The EDR engagement gate (write a
table only once the panel reports headroom) is described behavior, implemented here from scratch.

## License text (identical for all three)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
