`storr-excerpts.xml` retains the complete TEI header and six speech elements
from the pinned Storr/Perseus Greek XML, selected by first line number: 1,
151, 625a (gap only), 1517, 1517a (shared verse), and 1524 (closing chorus).
Only the surrounding edition container was reduced; no verse was rewritten.
The full exact-byte source, immutable URL, acquisition date and SHA-256 are in
`corpus/provenance/oedipus-tyrannus.json`. These excerpts test boundaries, not
full-play completeness. The full replay check verifies all 1,482 line elements.

Source: Sophocles, volume 1, Francis Storr (editor), London: William Heinemann
Ltd.; New York: The Macmillan Company, 1912. Perseus Project, Tufts University,
and PerseusDL/canonical-greekLit contributors, commit
0189b9c8d8d1f148133f2f0af309b4ee90ea4332. Repository text is licensed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) unless otherwise
indicated; no special exclusion was found in this Greek header/CTS metadata.
Changes here: excerpt selection and XML serialization. The repository README
also requests offering modifications to Perseus; no external contact was made.

`critical-signs.xml` is a synthetic fixture, not historical source text. It
exercises add/del signs (as explained by the source's 2010-12-24 change log),
apparatus lemma selection, excluded notes/directions, lacunae, and NFC.

`buti-opening.html` retains the first two poem blocks (Inferno I, lines 1–45)
from the Wikisource Buti/Giannini transcription, including its page boundary,
line-number spans, style nodes and footnote anchors. Non-class attributes were
removed and the DOM serialized for this fixture. Synthetic excluded commentary
and a footnote poem surround the real excerpt to test selection boundaries.
The exact acquisition is `buti-inferno-1.html` in Dante's provenance ledger.

Source: Dante Alighieri, text in _Commento di Francesco da Buti sopra la Divina
Comedia_, edited by Crescentino Giannini, Pisa: Fratelli Nistri, 1858, volume I;
Italian Wikisource contributors. Source metadata identifies CC BY-SA 3.0 and
GFDL, with CC BY-SA 4.0 in the site footer. The fixture preserves the older
readings and capitalization. The corpus has six line-specific Paradiso repairs
verified against retained 1862 scan images; no modernization or full collation
is claimed.
