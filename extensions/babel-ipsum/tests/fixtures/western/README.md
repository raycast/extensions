# Western extraction fixtures

These files contain exact UTF-8 markup excerpts from the retained source snapshots,
wrapped in a minimal MediaWiki content container. The Macbeth excerpt also has
its required speech-container wrapper. Literary text and source markup inside
each excerpt are unchanged. Cicero covers the opening paragraphs through the
paragraph beginning “Ego vero, quoniam”; Fantine covers the two-line song and
its adjacent prose; Macbeth covers Hecate’s speech and its mixed italic direction.

Source attribution, edition and license notices remain in the corresponding
`corpus/books/<id>.json`. Exact acquisition records, retrieval dates and complete
snapshot hashes remain in `corpus/provenance/<id>.json`.

- `cicero-continuations.html`: [de-finibus](https://la.wikisource.org/wiki/De_finibus_bonorum_et_malorum/Liber_I),
  snapshot `liber-i.html`, SHA-256 `d6cc8bfbc7ab3ba4b6adb01c4c96fd04f9a480e070660afa9da3a0056625d83b`.
- `macbeth-hecate.html`: [macbeth](<https://en.wikisource.org/wiki/Macbeth_(1918)_Yale/Text/Act_III>),
  snapshot `act-3.html`, SHA-256 `6e1b138fc648c2b4c2c48594d3412849e9fcd2699633d924936c0f8a8194cc01`.
- `fantine-song.html`: [les-miserables-fantine](https://fr.wikisource.org/wiki/Les_Misérables/Tome_1/Livre_4/01),
  snapshot `book-4-chapter-1.html`, SHA-256 `48d2a55569d54d6fbb08d4b8938717473ff8b1e889e736a03b4bc530145055df`.

Normal tests read only these excerpts and canonical prepared JSON/provenance.
The optional complete snapshot audit is:

```sh
CORPUS_FULL_REPLAY=1 python3 -m unittest discover -s tests -p western_extraction_test.py
```

It requires `.cache/corpus/sources/` and checks all seven prepared books without
network access or writes. `python3 scripts/import-western.py --offline --check`
runs the same complete replay directly.
