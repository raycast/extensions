"""Focused offline tests for the historical Greek adapter and acquisition seam."""

import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unicodedata
import unittest
from unittest.mock import MagicMock, patch

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests/fixtures/historical-dante-greek"
spec = importlib.util.spec_from_file_location("historical_dante_greek", ROOT / "scripts/import-historical-dante-greek.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class GreekExtractionTest(unittest.TestCase):
    def test_critical_signs_lemma_notes_directions_gap_and_nfc(self):
        _, groups, lines = m.greek_groups((FIXTURES / "critical-signs.xml").read_bytes())
        self.assertEqual(len(lines), 4)
        self.assertEqual([g[0] for g in groups], [1, 3])
        self.assertEqual(groups[0][4], "ὦ <τέκνα>, [παλαιά] λέγω· νέα.\nκαὶ πάλιν. τέλος.")
        self.assertEqual(groups[1][4], "ἰὼ πόλις.")
        self.assertNotIn("Οἰδίπους", groups[0][4])
        self.assertEqual(groups[0][4], unicodedata.normalize("NFC", groups[0][4]))

    def test_real_storr_opening_chorus_shared_line_gap_and_ending(self):
        raw = (FIXTURES / "storr-excerpts.xml").read_bytes()
        root, groups, lines = m.greek_groups(raw)
        self.assertEqual(len(groups), 5)
        self.assertEqual([g[0] for g in groups], [1, 2, 4, 5, 6])
        self.assertEqual([g[2] for g in groups], ["1", "151", "1517", "1517a", "1524"])
        self.assertEqual([g[1] for g in groups], ["Οἰδίπους", "Χορός", "Οἰδίπους", "Κρέων", "Χορός"])
        self.assertTrue(groups[0][4].startswith("ὦ τέκνα, Κάδμου τοῦ πάλαι νέα τροφή,"))
        self.assertTrue(groups[-1][4].endswith("τέρμα τοῦ βίου περάσῃ μηδὲν ἀλγεινὸν παθών."))
        # Independent reference for this real fixture (only l text and one gap):
        expected = [unicodedata.normalize("NFC", " ".join("".join(line.itertext()).split())) for line in lines]
        self.assertEqual("\n".join(g[4] for g in groups), "\n".join(v for v in expected if v))
        header = "".join(root.find("t:teiHeader", m.NS).itertext())
        for evidence in ["Francis Storr", "1912", "1988", "Greek text for these files was taken"]:
            self.assertIn(evidence, header)
        with self.assertRaisesRegex(ValueError, "not the whole play"):
            self.import_fixture(raw)

    def import_fixture(self, raw):
        # The supporting evidence snapshots are small, so construct only their
        # required public statements here; whole acquisition is tested separately.
        sources = MagicMock()
        sources.raw = {
            m.GREEK_XML: raw,
            "README.md": b"Unless otherwise indicated, all contents of this repository are licensed under a\nCreative Commons Attribution-ShareAlike 4.0 International License",
            "commit.json": json.dumps({"sha": m.GREEK_COMMIT}).encode(),
            "__cts__.xml": b'<work xmlns="http://chs.harvard.edu/xmlns/cts"><edition xml:lang="grc">Storr, Francis</edition></work>',
        }
        return m.import_greek(sources)

    def test_rejects_translation_and_wrong_edition(self):
        raw = (FIXTURES / "storr-excerpts.xml").read_bytes()
        with self.assertRaisesRegex(ValueError, "Ancient Greek"):
            m.greek_groups(raw.replace(b'<text xml:lang="grc">', b'<text xml:lang="eng">'))
        with self.assertRaisesRegex(ValueError, "Greek edition"):
            m.greek_groups(raw.replace(b"perseus-grc2", b"perseus-eng2"))
        with self.assertRaisesRegex(ValueError, "print edition"):
            self.import_fixture(raw.replace(b"1912", b"1994"))
        with self.assertRaisesRegex(ValueError, "rights statement"):
            self.import_fixture(raw.replace(b"</publicationStmt>", b"<availability>Restricted</availability></publicationStmt>"))

    def test_rejects_unaccounted_verse_and_unrecognized_inline_markup(self):
        raw = (FIXTURES / "critical-signs.xml").read_bytes()
        with self.assertRaisesRegex(ValueError, "dropped, duplicated, or reordered"):
            m.greek_groups(raw.replace(b"</div>", '<l n="5">τέλος.</l></div>'.encode()))
        with self.assertRaisesRegex(ValueError, "outside Greek verse"):
            m.greek_groups(raw.replace(b"</div>", b"<p>lost text</p></div>"))
        with self.assertRaisesRegex(ValueError, "Unaccounted text"):
            m.greek_groups(raw.replace(b"</sp>", b"unaccounted</sp>", 1))
        with self.assertRaisesRegex(ValueError, "Unsupported Greek inline"):
            m.greek_groups(raw.replace(b"<hi>", b"<choice>").replace(b"</hi>", b"</choice>"))
        with self.assertRaisesRegex(ValueError, "exactly one lemma"):
            m.greek_groups(raw.replace(b"<lem>", b"<rdg>").replace(b"</lem>", b"</rdg>"))

    def test_rejects_entity_declarations(self):
        with self.assertRaisesRegex(ValueError, "DTD/entity"):
            m.parse_tei(b'<!DOCTYPE TEI [<!ENTITY x "expanded">]><TEI/>')

    def test_prepared_book_contract_language_edition_and_complete_play(self):
        data = json.loads((ROOT / "corpus/books/oedipus-tyrannus.json").read_text())
        book = data["book"]
        self.assertEqual(data["schemaVersion"], 1)
        self.assertEqual((book["id"], book["language"], book["locale"]), ("oedipus-tyrannus", "Ancient Greek", "el"))
        for field in ["title", "author", "direction", "sourceUrl", "edition", "scope", "license", "attribution", "editorialNote", "sentenceSeparator"]:
            self.assertIsInstance(book[field], str)
            self.assertTrue(book[field])
        self.assertIn("1912", book["edition"])
        self.assertIn("Francis Storr", book["edition"])
        self.assertIn("CC BY-SA 4.0", book["license"])
        self.assertIn("625a", book["editorialNote"])
        self.assertIn(m.GREEK_COMMIT, book["sourceUrl"])
        sections = data["sections"]
        self.assertEqual(len(sections), 457)
        self.assertEqual(sections[-1]["position"], 458)
        self.assertEqual(len({s["id"] for s in sections}), 457)
        self.assertEqual([s["position"] for s in sections], sorted({s["position"] for s in sections}))
        self.assertTrue(sections[0]["passages"][0]["text"].startswith("ὦ τέκνα, Κάδμου"))
        self.assertTrue(sections[-1]["passages"][0]["text"].endswith("μηδὲν ἀλγεινὸν παθών."))
        ledger = json.loads((ROOT / "corpus/provenance/oedipus-tyrannus.json").read_text())
        self.assertEqual(set(ledger), set(m.GREEK_SOURCES))
        for section in sections:
            record = ledger[Path(section["snapshotPath"]).name]
            self.assertEqual(section["snapshotSha256"], record["sha256"])
            self.assertEqual(section["sourceUrl"], record["sourceUrl"])
            self.assertEqual(section["revisionUrl"], record["sourceUrl"])
            text = section["passages"][0]["text"]
            self.assertEqual(text, unicodedata.normalize("NFC", text))
            self.assertTrue(text.strip())
            self.assertEqual(section["passages"][0]["kind"], "speech")
        self.assertGreater(sum("\n" in s["passages"][0]["text"] for s in sections), 100)

    @unittest.skipUnless(os.environ.get("CORPUS_FULL_REPLAY") == "1", "optional retained-cache replay: set CORPUS_FULL_REPLAY=1")
    def test_exact_full_play_replay_is_read_only_and_offline(self):
        with patch.object(m, "download", side_effect=AssertionError("network used")), \
                patch.object(Path, "write_text", side_effect=AssertionError("file written")), \
                patch.object(m.Sources, "save", side_effect=AssertionError("sources saved")), \
                contextlib.redirect_stdout(io.StringIO()):
            m.main(["--book", "oedipus-tyrannus", "--check"])
        sources = m.Sources("oedipus-tyrannus", m.GREEK_SOURCES, offline=True)
        _, groups, lines = m.greek_groups(sources.raw[m.GREEK_XML])
        self.assertEqual((len(groups), len(lines)), (457, 1482))
        self.assertEqual(sum(bool(m.normalize(m.greek_line(line))) for line in lines), 1481)


class HistoricalAcquisitionTest(unittest.TestCase):
    def test_acquisition_stages_bytes_and_records_contact_and_hash(self):
        raw = 'Ἑλληνικά\n'.encode()
        with tempfile.TemporaryDirectory() as directory, patch.object(m, "ROOT", Path(directory)), \
                patch.object(m, "download", return_value=raw) as fetch:
            sources = m.Sources("example", {"source.xml": "https://example.org/pinned"})
            self.assertFalse(sources.path.exists())
            self.assertFalse(sources.directory.exists())
            sources.save()
            fetch.assert_called_once_with("https://example.org/pinned")
            self.assertEqual((sources.directory / "source.xml").read_bytes(), raw)
            record = json.loads(sources.path.read_text())["source.xml"]
            self.assertEqual(record["sha256"], hashlib.sha256(raw).hexdigest())
            self.assertEqual(record["responseUrl"], record["sourceUrl"])
            before = sources.path.read_bytes()
            with patch.object(m, "download", side_effect=AssertionError("network")):
                replay = m.Sources("example", {"source.xml": "https://example.org/pinned"}, offline=True)
                self.assertEqual(replay.raw["source.xml"], raw)
            self.assertEqual(sources.path.read_bytes(), before)
            (sources.directory / "source.xml").write_bytes(raw + b"changed")
            with self.assertRaisesRegex(ValueError, "provenance mismatch"):
                m.Sources("example", {"source.xml": "https://example.org/pinned"})
            (sources.directory / "source.xml").write_bytes(raw)
            with self.assertRaisesRegex(ValueError, "provenance mismatch"):
                m.Sources("example", {"source.xml": "https://example.org/other"})
            sources.path.unlink()
            with self.assertRaisesRegex(ValueError, "provenance mismatch"):
                m.Sources("example", {"source.xml": "https://example.org/pinned"})

    def test_missing_offline_sources_and_check_never_write_or_fetch(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(m, "ROOT", Path(directory)), \
                patch.object(m, "download", side_effect=AssertionError("network")), \
                patch.object(Path, "write_text", side_effect=AssertionError("write")):
            with self.assertRaises(FileNotFoundError):
                m.main(["--check"])
            with self.assertRaises(FileNotFoundError):
                m.main(["--offline"])
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_failed_acquisition_does_not_persist_partial_sources(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(m, "ROOT", Path(directory)), \
                patch.object(m, "download", side_effect=[b"one", ValueError("second failed")]):
            with self.assertRaisesRegex(ValueError, "second failed"):
                m.Sources("example", {"one": "https://example.org/one", "two": "https://example.org/two"})
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_check_rejects_prepared_drift_without_saving(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(m, "ROOT", Path(directory)):
            path = Path(directory) / "corpus/books/oedipus-tyrannus.json"
            path.parent.mkdir(parents=True)
            path.write_text("old content")
            with patch.object(m, "Sources") as sources, \
                    patch.dict(m.IMPORTERS, {"oedipus-tyrannus": ({}, lambda _: {"sections": []})}):
                with self.assertRaisesRegex(ValueError, "Prepared corpus differs"):
                    m.main(["--check"])
                sources.assert_called_once_with("oedipus-tyrannus", {}, offline=True)
                sources.return_value.save.assert_not_called()
                self.assertEqual(path.read_text(), "old content")

    def test_download_contact_ua_exact_bytes_limit_and_redirects(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.geturl.return_value = "https://example.org/pinned"
        response.read.return_value = 'ὦ τέκνα'.encode()
        opener = MagicMock()
        opener.open.return_value = response
        with patch.object(m, "build_opener", return_value=opener):
            self.assertEqual(m.download("https://example.org/pinned"), 'ὦ τέκνα'.encode())
            request = opener.open.call_args.args[0]
            self.assertEqual(request.get_header("User-agent"), m.USER_AGENT)
            self.assertIn("+https://git.cafe/felrov/vibed-ipsum", request.get_header("User-agent"))
            self.assertEqual(request.get_header("Accept-encoding"), "identity")
            response.read.assert_called_with(m.MAX_SOURCE_BYTES + 1)
            response.geturl.return_value = "https://other.example/redirect"
            with self.assertRaisesRegex(ValueError, "response URL"):
                m.download("https://example.org/pinned")
            response.geturl.return_value = "https://example.org/pinned"
            for raw in [b"", b"x" * (m.MAX_SOURCE_BYTES + 1)]:
                response.read.return_value = raw
                with self.assertRaisesRegex(ValueError, "Empty or oversized"):
                    m.download("https://example.org/pinned")
            response.read.return_value = b"\xff"
            with self.assertRaises(UnicodeDecodeError):
                m.download("https://example.org/pinned")
        with self.assertRaisesRegex(ValueError, "redirect refused"):
            m.NoRedirect().redirect_request(request, None, 302, "redirect", {}, "http://127.0.0.1/")

    def test_rejects_unsafe_cache_paths_and_non_https_sources(self):
        for book, urls in [("../escape", {}), ("example", {"../escape": "https://example.org"}), ("example", {"file": "http://example.org"})]:
            with self.subTest(book=book, urls=urls), self.assertRaises(ValueError):
                m.Sources(book, urls)


if __name__ == "__main__":
    unittest.main()
