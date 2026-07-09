<!--
FIXTURE — hyphenation
Input: soft-broken words, capital-led broken words, and a known-limitation case (mid-compound break)
Expected on Unwrap with hyphenation ON:
  - `inter-` + `esting` → `interesting` (soft hyphen stripped)
  - `every-` + `where` → `everywhere` (soft hyphen stripped — same word continued)
  - `State-` + `wide` → `State- wide` (capital-led words preserve the hyphen, with a space)
  - `state-of-the-` + `art` → `state-of-the- art` (KNOWN LIMITATION — mid-compound break gains a space)
Expected on Unwrap with hyphenation OFF: every case keeps the hyphen with a single space join
-->

This is an inter-
esting test of soft hyphens that should join cleanly.

A cross-platform tool runs every-
where so the soft hyphen joins both halves of one word.

A State-
wide policy keeps the hyphen because the broken word is capital-led.

The state-of-the-
art is a known v1 limitation: a mid-compound break gains a space.
