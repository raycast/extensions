"""Historical source selection, integrity and offline replay; no network required."""

import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import MagicMock, patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("historical_import", ROOT / "scripts/import-historical-hindi-korean.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
FIXTURES = ROOT / "tests/fixtures/historical-hindi-korean"


def cached(book_id, filenames):
    return all((ROOT / ".cache/corpus/sources" / book_id / name).exists() for name in filenames)


KO_CACHED = cached("jindallae-kkot", ["index.html", *(f"{p:03}.html" for p in MODULE.KO_POSITIONS),
                                       *MODULE.EVIDENCE["jindallae-kkot"]])
HI_CACHED = cached("godaan", [*(f"chapter-{p:02}.html" for p in MODULE.HI_CHAPTERS),
                            *MODULE.EVIDENCE["godaan"]])


class HistoricalHindiKoreanTests(unittest.TestCase):
    def test_real_original_column_preserves_old_hangul_and_stanzas_once(self):
        html = (FIXTURES / "original-columns.html").read_text()
        expected = """먼훗날 당신이 차즈시면
그ᄯᅢ에 내말이 「니젓노라」

당신이 속으로나무리면
「뭇쳑그리다가 니젓노라」

그래도 당신이 나무리면
「밋기지안어서 니젓노라」

오늘도어제도 아니닛고
먼훗날 그ᄯᅢ에 「니젓노라」"""
        self.assertEqual(MODULE.korean_original(html), expected)
        self.assertNotIn("잊었노라", MODULE.korean_original(html))
        self.assertNotIn("먼後日", MODULE.korean_original(html))

    def test_never_falls_back_to_unlabelled_or_modern_column(self):
        html = '<div class="mw-parser-output"><div class="poem">modern</div></div>'
        with self.assertRaisesRegex(ValueError, "exactly one explicitly labelled"):
            MODULE.korean_original(html)
        real = (FIXTURES / "original-columns.html").read_text()
        with self.assertRaisesRegex(ValueError, "exactly one explicitly labelled"):
            MODULE.korean_original(real.replace("원문", "현대어"))
        with self.assertRaisesRegex(ValueError, "exactly one explicitly labelled"):
            MODULE.korean_original(real.replace("<b>원문</b>", "<b>원문</b><b>원문</b>"))

    def test_rejects_untranscribed_image_in_original(self):
        html = (FIXTURES / "original-columns.html").read_text()
        with self.assertRaisesRegex(ValueError, "Untranscribed image"):
            MODULE.korean_original(html.replace("차즈시면", '차즈시면<img src="glyph.png">'))

    @unittest.skipUnless(KO_CACHED and HI_CACHED, "Optional ignored source snapshots unavailable; acquire with --fetch")
    def test_offline_replay_and_check_neither_connect_nor_write(self):
        paths = [ROOT / "corpus" / folder / f"{book}.json"
                 for book in MODULE.BOOK_IDS for folder in ("books", "provenance")]
        before = [p.read_bytes() for p in paths]
        with patch.object(MODULE, "urlopen", side_effect=AssertionError("offline must not connect")):
            MODULE.run(check=True)
        self.assertEqual([p.read_bytes() for p in paths], before)

    @unittest.skipUnless(KO_CACHED, "Optional ignored Korean snapshots unavailable")
    def test_korean_selection_matches_contents_positions_and_original_columns(self):
        snapshots = MODULE.Snapshots("jindallae-kkot")
        book, sections, remediation = MODULE.korean(snapshots)
        self.assertEqual([s["position"] for s in sections], list(MODULE.KO_POSITIONS))
        self.assertEqual(len(sections), 11)
        self.assertEqual(remediation["omittedContentsEntries"], 115)
        self.assertIn("not the complete collection", book["scope"])
        self.assertEqual(len({s["id"] for s in sections}), 11)
        for section in sections:
            html = (ROOT / section["snapshotPath"]).read_text()
            self.assertEqual(section["passages"], [{"position": 1, "kind": "verse",
                             "text": MODULE.korean_original(html)}])

    @unittest.skipUnless(HI_CACHED, "Optional ignored Hindi snapshots unavailable")
    def test_hindi_sections_are_unchanged_and_rights_gap_is_visible(self):
        book, sections, remediation = MODULE.hindi(MODULE.Snapshots("godaan"))
        canonical = json.dumps(sections, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
        # Digest of all 571 pre-remediation paragraphs and their section provenance.
        self.assertEqual(hashlib.sha256(canonical).hexdigest(),
                         "a7230ed3ac3ab79a4060ff7c2ef052ad121e1134987f2181e38aaf8d053050e5")
        self.assertEqual(remediation["status"], "blocked-historical-replacement-existing-text-retained")
        self.assertIn("did not revive expired rights", book["license"])
        self.assertIn("independently maintained US copyright", book["license"])
        self.assertIn("1961", book["editorialNote"])

    @unittest.skipUnless(KO_CACHED and HI_CACHED, "Optional ignored evidence snapshots unavailable")
    def test_evidence_snapshots_back_the_rejected_edition_claims(self):
        ko = MODULE.Snapshots("jindallae-kkot")
        scan = ko.get("historical-scan-index.html", MODULE.KO_SCAN_INDEX).decode()
        self.assertIn('id="ws-index-year-value" class="ws-index-value">1951', scan)
        hi = MODULE.Snapshots("godaan")
        page = hi.get("historical-candidate-go-dan.html", MODULE.EVIDENCE["godaan"]["historical-candidate-go-dan.html"]).decode()
        self.assertIn("वर्तमान संस्करण", page)
        self.assertIn("१९६१", page)
        act = hi.get("historical-india-1992.html", MODULE.INDIA_1992).decode()
        self.assertIn("immediately before the commencement", act)

    def test_snapshot_hash_and_source_mismatch_fail_without_network(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(MODULE, "ROOT", Path(directory)):
            root = Path(directory)
            path = root / "corpus/provenance/godaan.json"
            path.parent.mkdir(parents=True)
            raw, url = b"original bytes", "https://example.org/source"
            path.write_text(json.dumps({"sample.html": {"sourceUrl": url,
                "encoding": "utf-8", "retrievedOn": "2026-10-23", "sha256": hashlib.sha256(raw).hexdigest()}}))
            snapshots = MODULE.Snapshots("godaan")
            snapshots.directory.mkdir(parents=True)
            sample = snapshots.directory / "sample.html"
            sample.write_bytes(raw)
            self.assertEqual(snapshots.get("sample.html", url), raw)
            with self.assertRaisesRegex(ValueError, "provenance mismatch"):
                snapshots.get("sample.html", url + "/other")
            sample.write_bytes(raw + b"!")
            with self.assertRaisesRegex(ValueError, "provenance mismatch"):
                snapshots.get("sample.html", url)
            with self.assertRaisesRegex(FileNotFoundError, "acquire with --fetch"):
                snapshots.get("missing.html", url)

    def test_check_detects_prepared_drift(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "book.json"
            path.write_text('{"text":"changed"}')
            with self.assertRaisesRegex(ValueError, "Prepared output differs"):
                MODULE.save(path, {"text": "original"}, check=True)
            self.assertEqual(json.loads(path.read_text()), {"text": "changed"})

    def test_fetch_records_contact_response_url_and_bytes_and_never_refetches(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(MODULE, "ROOT", Path(directory)):
            root = Path(directory)
            ledger = root / "corpus/provenance/godaan.json"
            ledger.parent.mkdir(parents=True)
            ledger.write_text("{}")
            response = MagicMock()
            response.__enter__.return_value = response
            response.read.return_value = "मूल पाठ।".encode()
            response.url = "https://example.org/redirected"
            with patch.object(MODULE, "urlopen", return_value=response) as acquire, patch.object(MODULE.time, "sleep"):
                snapshots = MODULE.Snapshots("godaan", fetch=True)
                raw = snapshots.get("fresh.html", "https://example.org/source")
                self.assertEqual(snapshots.get("fresh.html", "https://example.org/source"), raw)
                acquire.assert_called_once()
                request = acquire.call_args.args[0]
                self.assertEqual(request.get_header("User-agent"), MODULE.USER_AGENT)
            record = snapshots.records["fresh.html"]
            self.assertEqual(record["responseUrl"], response.url)
            self.assertEqual(record["sha256"], hashlib.sha256(raw).hexdigest())
            self.assertEqual(record["encoding"], "utf-8")
            self.assertEqual(json.loads(ledger.read_text())["snapshots"][0]["sha256"], record["sha256"])


if __name__ == "__main__":
    unittest.main()
