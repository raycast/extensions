# Multilingual extraction fixtures

`godaan-dd-p.html` retains the chapter 1 source range beginning with
`<dl><dd>भोला पर नशा` and ending immediately before `<p>भोला ने गद् गद कंठ`.
The test wrapper adds only the MediaWiki content container and chapter heading.
The fragment includes all 29 `dd` elements in that range, their `p` continuations,
and explicit paragraph breaks. `godaan-dd-p.json` records the expected complete
paragraphs before sampling. The tests also compare every source character after
layout whitespace normalization, so the expected output alone is not the oracle.

Source: [Hindi Wikisource, गोदान-१](https://hi.wikisource.org/wiki/प्रेमचंद_रचनावली_६/गोदान-१).
The exact full-source hash, retrieval date, and encoding are recorded in
`corpus/provenance/godaan.json` under `chapter-01.html`; the selected revision and
attribution are in `corpus/books/godaan.json`. Original work public domain;
Wikisource contributor text is available under CC BY-SA 4.0 with possible
additional terms, as recorded in that book's license metadata.

Run the normal, cache-independent tests:

```sh
python3 -m unittest discover -s tests -p multilingual_extraction_test.py
```

With the optional raw source cache available, verify complete extraction for all
seven multilingual books without rewriting the prepared books or provenance:

```sh
python3 scripts/import-multilingual.py --audit
```

Use `--books ID ...` to audit selected books. Missing cache files fail the explicit
audit; no network acquisition occurs. The ordinary importer command replays the
cache into prepared JSON; network acquisition requires the separate `--fetch` flag.
