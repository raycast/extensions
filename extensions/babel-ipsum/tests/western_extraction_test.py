"""Offline source-integrity and literary-boundary checks for Western adapters."""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import types
import tempfile
import unicodedata
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("western", ROOT / "scripts/import-western.py")
western = importlib.util.module_from_spec(spec)
spec.loader.exec_module(western)


def load(book):
    return json.loads((ROOT / "corpus/books" / f"{book}.json").read_text())


def fixture(name):
    return (ROOT / "tests/fixtures/western" / name).read_bytes()


def texts(book):
    return [p["text"] for s in load(book)["sections"] for p in s["passages"]]


class WesternExtractionTest(unittest.TestCase):
    @unittest.skipUnless(os.environ.get("CORPUS_FULL_REPLAY") == "1",
                         "optional raw-cache audit: set CORPUS_FULL_REPLAY=1")
    def test_all_seven_replay_without_network_or_writes(self):
        args = types.SimpleNamespace(offline=True, check=True, refresh=False, fetch_only=False)
        with contextlib.redirect_stdout(io.StringIO()):
            for book in western.BOOK_IDS:
                with self.subTest(book=book):
                    western.make_book(book,args)

    def test_acquisition_uses_tracked_ledger_without_writing_in_check_mode(self):
        data = b'<div class="mw-parser-output"><p>Source.</p></div>'
        record = {"sourceUrl": "https://example.org/source", "retrievedOn": "2020-01-02",
                  "snapshotSha256": hashlib.sha256(data).hexdigest()}
        args = types.SimpleNamespace(offline=True, check=True, refresh=False)
        with tempfile.TemporaryDirectory() as directory, mock.patch.object(western, "ROOT", Path(directory)):
            root = Path(directory)
            snapshot = root / ".cache/corpus/sources/example/chapter.html"
            snapshot.parent.mkdir(parents=True)
            snapshot.write_bytes(data)
            provenance = root / "corpus/provenance/example.json"
            provenance.parent.mkdir(parents=True)
            # Extra acquisition entries and fields must survive unchanged.
            ledger = {"schemaVersion": 1, "encoding": "UTF-8", "sources": {
                "chapter.html": record, "unused.html": {"historicalEvidence": True}}}
            provenance.write_text(json.dumps(ledger))
            before = provenance.read_bytes()
            with mock.patch.object(Path, "write_text", side_effect=AssertionError("check wrote a file")), \
                 mock.patch.object(western.urllib.request, "urlopen", side_effect=AssertionError("network used")):
                self.assertEqual(western.acquire("example", "chapter", record["sourceUrl"], args), (snapshot, data))
                snapshot.write_bytes(data + b"modified")
                with self.assertRaisesRegex(ValueError, "Snapshot differs from acquisition ledger"):
                    western.acquire("example", "chapter", record["sourceUrl"], args)
                with self.assertRaisesRegex(ValueError, "Missing offline snapshot"):
                    western.acquire("example", "missing", record["sourceUrl"], args)
            self.assertEqual(provenance.read_bytes(), before)

    def test_check_requires_acquisition_record(self):
        args = types.SimpleNamespace(offline=True, check=True, refresh=False)
        with tempfile.TemporaryDirectory() as directory, mock.patch.object(western, "ROOT", Path(directory)):
            snapshot = Path(directory) / ".cache/corpus/sources/example/chapter.html"
            snapshot.parent.mkdir(parents=True)
            snapshot.write_bytes(b"source")
            with self.assertRaisesRegex(ValueError, "Missing acquisition record"):
                western.acquire("example", "chapter", "https://example.org/source", args)
            self.assertFalse((Path(directory) / "corpus/provenance/example.json").exists())

    def test_contract_provenance_and_minimum_variety(self):
        names = {"la":"Latin","es":"Spanish","pt":"Portuguese","en":"English","fr":"French","it":"Italian","de":"German"}
        for book in western.BOOK_IDS:
            with self.subTest(book=book):
                corpus = load(book)
                self.assertEqual(corpus["schemaVersion"],1)
                self.assertEqual(corpus["book"]["id"],book)
                self.assertEqual(corpus["book"]["language"],names[corpus["book"]["locale"]])
                self.assertEqual(corpus["book"]["direction"],"ltr")
                self.assertEqual(corpus["book"]["sentenceSeparator"]," ")
                for key in ("id","title","author","language","locale","sourceUrl","edition","scope","license","attribution","editorialNote"):
                    self.assertIsInstance(corpus["book"][key],str)
                    self.assertTrue(corpus["book"][key])
                ledger = json.loads((ROOT / "corpus/provenance" / f"{book}.json").read_text())
                self.assertEqual(ledger["schemaVersion"], 1)
                self.assertTrue(ledger["encoding"].startswith("UTF-8"))
                self.assertTrue(ledger["sources"])
                total = []
                for position,section in enumerate(corpus["sections"],1):
                    self.assertEqual(section["position"],position)
                    snapshot = Path(section["snapshotPath"])
                    self.assertEqual(snapshot.parent, Path(".cache/corpus/sources") / book)
                    record = ledger["sources"][snapshot.name]
                    self.assertRegex(section["snapshotSha256"], r"^[0-9a-f]{64}$")
                    self.assertEqual(record["snapshotSha256"], section["snapshotSha256"])
                    self.assertEqual(record["sourceUrl"], section["sourceUrl"].split("#")[0])
                    self.assertRegex(record["retrievedOn"], r"^\d{4}-\d{2}-\d{2}$")
                    self.assertTrue(section["sourceUrl"].startswith("https://"))
                    self.assertTrue("oldid=" in section["revisionUrl"] or "gutenberg.org/files/57001/" in section["revisionUrl"])
                    for index,passage in enumerate(section["passages"],1):
                        text = passage["text"]
                        total.append(text)
                        self.assertEqual(passage["position"],index)
                        self.assertIn(passage["kind"],{"prose","verse","speech"})
                        self.assertEqual(unicodedata.normalize("NFC",text),text)
                        self.assertEqual(text,text.strip())
                        self.assertNotRegex(text,r"[\x00-\x09\x0b-\x1f\u00ad\u200b]")
                        self.assertNotRegex(text,r"mw-parser-output|TemplateStyles|<pageseparator|\{\{\{|Footnotes to Act|Creative Commons")
                        if passage["kind"] == "prose":
                            self.assertNotIn("\n",text)
                self.assertEqual(corpus["retrievedOn"], max(ledger["sources"][Path(s["snapshotPath"]).name]["retrievedOn"] for s in corpus["sections"]))
                self.assertGreaterEqual(len(total),10)
                self.assertGreaterEqual(len(re.findall(r"[.!?](?:[’'\"»”)]|\s|$)"," ".join(total))),20)

    def test_complete_compact_coverage_and_book_ends(self):
        expected = {"de-finibus":1,"cuentos-de-la-selva":8,"o-alienista":13,"macbeth":5,"die-verwandlung":3}
        for book,count in expected.items():
            self.assertEqual(len(load(book)["sections"]),count)
        self.assertTrue(texts("de-finibus")[0].startswith("Non eram nescius, Brute"))
        self.assertTrue(texts("de-finibus")[-1].endswith("nunquam est data."))
        self.assertTrue(texts("cuentos-de-la-selva")[0].startswith("Había una vez un hombre"))
        self.assertTrue(texts("cuentos-de-la-selva")[-1].endswith("de un hombre y de una abeja."))
        self.assertTrue(texts("o-alienista")[-1].endswith("muita pompa e rara solemnidade."))
        self.assertTrue(texts("die-verwandlung")[-1].endswith("ihren jungen Körper dehnte."))

    def test_latin_continuations_and_table_quotation_in_source_order(self):
        root = western.parse(fixture("cicero-continuations.html"))
        units = western.extract_prose(root, "de-finibus")
        text = "\n".join(t for t, _ in units)
        fragments = ["Non eram nescius, Brute", "fodere aút arare", "— non enim illum",
                     "Iis igitur est difficilius", "Utinám ne in némore", "nihilo minus legimus",
                     "Quamquam, si plane sic verterem", "Graecum te, Albuci", "Sed iure Mucius", "Ego vero, quoniam"]
        offsets = []
        for fragment in fragments:
            self.assertEqual(text.count(fragment), 1, fragment)
            offsets.append(text.index(fragment))
        self.assertEqual(offsets, sorted(offsets))
        quote = next(t for t, k in units if "Graecum te, Albuci" in t)
        self.assertIn("Sabinum,\nMunicipem Ponti", quote)
        self.assertIn("cohorsque.\nΧαῖρε, Tite!", quote)
        quoted_lines = ["Graecum te, Albuci, quam Romanum atque Sabinum,",
                        "Municipem Ponti, Tritani, centurionum,",
                        "Praeclarorum hominum ac primorum signiferumque,",
                        "Maluisti dici. Graece ergo praetor Athenis,",
                        "Id quod maluisti, te, cum ad me accedi’, saluto:",
                        "Χαῖρε, inquam, Tite: lictores, turma omni’ cohorsque.",
                        "Χαῖρε, Tite! hinc hostis mi Albucius, hinc inimicus."]
        self.assertEqual(quote.count("\n".join(quoted_lines)), 1)
        for beginning, continuation in [("Non eram nescius", "— non enim illum"),
                                         ("Iis igitur", "nihilo minus legimus"),
                                         ("Quamquam, si", "Sed iure Mucius")]:
            self.assertTrue(any(beginning in t and continuation in t for t, _ in units))

    def test_macbeth_mixed_italic_direction_line_is_removed(self):
        root = western.parse(fixture("macbeth-hecate.html"))
        paragraph = next(n for n in root.walk() if n.tag == "p")
        # Exercise the mixed italic/plain-text printed direction directly;
        # full-act speech assembly is covered by the optional replay audit.
        hecate = "\n".join(line.strip() for line in western.dramatic_lines(paragraph).splitlines())
        self.assertNotIn("Come away", hecate)
        self.assertIn("Is mortals' chiefest enemy.\nHark! I am call'd;", hecate)
        self.assertIn("Sits in a foggy cloud, and stays for me.", hecate)

    def test_macbeth_inline_direction_keeps_following_dialogue(self):
        root = western.parse(b'<div class="mw-parser-output"><p><i>Knock</i>. Knock, knock, knock! Who&#39;s there?</p></div>')
        paragraph = next(n for n in root.walk() if n.tag == "p")
        self.assertIn("Knock, knock, knock! Who's there?", western.dramatic_lines(paragraph))

    def test_hugo_poem_preserves_lines_and_source_order(self):
        root = western.parse(fixture("fantine-song.html"))
        units = western.extract_prose(root, "les-miserables-fantine")
        song = ("Il le faut, je suis chevalier\nEt je pars pour la Palestine.", "verse")
        self.assertEqual(units.count(song), 1)
        index = units.index(song)
        self.assertTrue(units[index-1][0].endswith("elle reprit entre ses dents :"))
        self.assertTrue(units[index+1][0].startswith("Cette madame Thénardier"))

    def test_poem_inside_prose_container_is_emitted_once(self):
        root = western.parse(b'<div class="mw-parser-output"><p>Before.<span class="poem">First<br>Second</span>After.</p></div>')
        self.assertEqual(western.extract_prose(root, "les-miserables-fantine"),
                         [("Before.", "prose"), ("First\nSecond", "verse"), ("After.", "prose")])

    def test_quiroga_decorative_initials_and_source_spelling(self):
        opening = [s["passages"][0]["text"] for s in load("cuentos-de-la-selva")["sections"]]
        self.assertEqual([text.split()[0] for text in opening],["Había","Cierta","Había","En","Había","Había","En","Había"])
        self.assertIn("fué"," ".join(texts("cuentos-de-la-selva")))
        # This unresolved source reading is retained, not silently corrected.
        self.assertIn("contáudoles"," ".join(texts("cuentos-de-la-selva")))

    def test_alienista_original_orthography_and_publisher(self):
        corpus = load("o-alienista")
        self.assertIn("gutenberg.org/files/57001/",corpus["book"]["sourceUrl"])
        self.assertIn("Project Gutenberg",corpus["book"]["attribution"])
        self.assertNotIn("Wikisource contributions",corpus["book"]["license"])
        self.assertIn("chronicas da villa de ltaguahy",texts("o-alienista")[0])
        self.assertIn("O Alienista",corpus["book"]["attribution"])
        self.assertNotIn("THEORIA DO MEDALHÃO"," ".join(texts("o-alienista")))

    def test_hugo_samples_cover_all_eight_books_only_fantine(self):
        sections = load("les-miserables-fantine")["sections"]
        self.assertEqual({int(s["id"].split("-")[1]) for s in sections},set(range(1,9)))
        for section in sections:
            self.assertIn("/Tome_1/",section["sourceUrl"])
        opening = texts("les-miserables-fantine")[0]
        self.assertIn("M. Charles-François-Bienvenu Myriel",opening)
        self.assertNotIn("M. (Monsieur)",opening)
        self.assertIn("siége",opening)

    def test_dante_complete_cantos_and_verse_groups(self):
        corpus = load("divina-commedia")
        sections = corpus["sections"]
        self.assertEqual(len(sections),52)
        for cantica,end,count in [("inferno",34,18),("purgatorio",33,17),("paradiso",33,17)]:
            selected = [s for s in sections if s["id"].startswith(cantica+"-")]
            self.assertEqual(len(selected),count)
            self.assertEqual(selected[0]["id"],f"{cantica}-1")
            self.assertEqual(selected[-1]["id"],f"{cantica}-{end}")
        canto = sections[0]["passages"]
        self.assertEqual(canto[0]["text"],"Nel mezzo del cammin di nostra vita\nMi ritrovai per una selva oscura,\nChè la diritta via era smarrita;\n\nE quanto a dir qual’era è cosa dura\nQuesta selva selvaggia et aspra e forte,\nChe nel pensier rinnova la paura.")
        self.assertEqual(sum(len([line for line in p["text"].splitlines() if line]) for p in canto),136)
        self.assertGreater(len(canto[-1]["text"].splitlines()),1)
        for section in sections:
            for passage in section["passages"]:
                self.assertEqual(passage["kind"],"verse")
                self.assertNotRegex(passage["text"],r"\d")
                self.assertRegex(passage["text"],r'[.!?][”’"».)]*$')
        self.assertIn("Buti",corpus["book"]["edition"])
        self.assertIn("1858",corpus["book"]["edition"])
        self.assertIn("CC BY-SA",corpus["book"]["license"])

    def test_macbeth_speeches_exclude_apparatus_and_preserve_verse(self):
        all_text = texts("macbeth")
        self.assertEqual(all_text[0],"When shall we three meet again\nIn thunder, lightning, or in rain?")
        text = "\n".join(all_text)
        self.assertNotRegex(text,r"(?:^|\n)(?:Macb|Lady M|First Witch|Porter|Old Man)\.")
        self.assertNotRegex(text,r"\d|Enter Macbeth|Exeunt|Aside|cf\. n\.|Scene (?:One|Two)")
        self.assertIn("False face must hide what the false heart doth know.",text)
        self.assertIn("To-morrow, and to-morrow, and to-morrow",text)
        letter = next(p for p in all_text if p.startswith("'They met me"))
        self.assertIn("question them further",letter)
        self.assertNotIn("\n",letter.split("Glamis thou art")[0].rstrip())
        porter = next(p for p in all_text if p.startswith("Here's a knocking"))
        self.assertNotIn("\n",porter)
        self.assertIn("primrose",porter)
        self.assertIn("devil-porter",porter)
        doctor = load("macbeth")["sections"][4]["passages"][0]["text"]
        self.assertEqual(doctor,"I have two nights watched with you, but can perceive no truth in your report. When was it she last walked?")
        self.assertTrue(all_text[-1].endswith("Whom we invite to see us crown'd at Scone."))


if __name__ == "__main__":
    unittest.main()
