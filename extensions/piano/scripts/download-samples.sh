#!/bin/sh

set -eu

sample_base="https://raw.githubusercontent.com/Leethring/piano-sound-samples/master/sound_keyboard_staff"
sample_directory="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)/assets/samples"

mkdir -p "$sample_directory"

sample_names="
36 C
37 Cs
38 D
39 Ds
40 E
41 F
42 Fs
43 G
44 Gs
45 A
46 As
47 B
48 cc
49 ccs
50 dd
51 dds
52 ee
53 ff
54 ffs
55 gg
56 ggs
57 aa
58 aas
59 bb
60 c1
61 c1s
62 d1
63 d1s
64 e1
65 f1
66 f1s
67 g1
68 g1s
69 a1
70 a1s
71 b1
72 c2
73 c2s
74 d2
75 d2s
76 e2
77 f2
78 f2s
79 g2
80 g2s
81 a2
82 a2s
83 b2
84 c3
85 c3s
86 d3
87 d3s
88 e3
89 f3
90 f3s
91 g3
92 g3s
93 a3
94 a3s
95 b3
96 c4
"

printf '%s\n' "$sample_names" |
  while read -r midi source_name; do
    if [ -n "${midi:-}" ]; then
      curl --fail --location --silent --show-error \
        "$sample_base/$source_name.mp3" \
        --output "$sample_directory/$midi.mp3"
    fi
  done

printf 'Downloaded 61 MIT-licensed piano samples to %s\n' "$sample_directory"
