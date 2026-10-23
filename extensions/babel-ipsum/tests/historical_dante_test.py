"""Historical Dante text, apparatus boundaries, repairs and replay contracts."""

import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("historical_dante", ROOT / "scripts/import-historical-dante-greek.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class HistoricalDanteTest(unittest.TestCase):
    def test_real_opening_crosses_scan_pages_without_numbers_notes_or_commentary(self):
        raw = (ROOT / "tests/fixtures/historical-dante-greek/buti-opening.html").read_bytes()
        lines = m.dante_lines(raw)
        self.assertEqual(len(lines), 45)
        self.assertEqual(lines[:6], [
            "Nel mezzo del cammin di nostra vita", "Mi ritrovai per una selva oscura,",
            "Chè la diritta via era smarrita;", "E quanto a dir qual’era è cosa dura",
            "Questa selva selvaggia et aspra e forte,", "Che nel pensier rinnova la paura.",
        ])
        self.assertEqual(lines[14:17], ["Che m’avea di paura il cor compunto;", "Guardai in alto, e vidi le sue spalle", "Vestite già de’ raggi del pianeta,"])
        self.assertEqual(lines[27], "Poich’èi posato un poco il corpo lasso,")
        self.assertNotRegex("\n".join(lines), r"\d|Excluded|mw-parser|\[|\]")
        passages = m.dante_passages(lines)
        self.assertEqual(passages[0]["text"].splitlines(), lines[:3] + [""] + lines[3:6])
        self.assertEqual([line for p in passages for line in p["text"].splitlines() if line], lines)

    def test_missing_or_apparatus_only_poems_fail(self):
        for raw in [b"<p>No container</p>", b'<div class="mw-parser-output"><div class="references"><div class="poem">note</div></div></div>']:
            with self.assertRaisesRegex(ValueError, "Missing Dante"):
                m.dante_lines(raw)

    def test_prepared_cantos_scope_historical_readings_and_repair_locations(self):
        data = json.loads((ROOT / "corpus/books/divina-commedia.json").read_text())
        book = data["book"]
        self.assertEqual((book["id"], book["language"], book["locale"]), ("divina-commedia", "Italian", "it"))
        self.assertIn("1858", book["edition"])
        self.assertIn("1860", book["edition"])
        self.assertIn("1862", book["edition"])
        self.assertIn("Giannini", book["edition"])
        ledger = json.loads((ROOT / "corpus/provenance/divina-commedia.json").read_text())["sources"]
        expected = [(f"{cantica.lower()}-{number}", count) for cantica, cantos in m.DANTE_CANTOS.items() for number, count in cantos]
        self.assertEqual(len(expected), 52)
        self.assertEqual([s["id"] for s in data["sections"]], [id for id, _ in expected])
        for section, (_, count) in zip(data["sections"], expected):
            lines = [line for passage in section["passages"] for line in passage["text"].splitlines() if line]
            self.assertEqual(len(lines), count)
            self.assertNotRegex("\n".join(lines), r"[\d{}|]")
            record = ledger[Path(section["snapshotPath"]).name]
            self.assertEqual(record["snapshotSha256"], section["snapshotSha256"])
            self.assertEqual(record["sourceUrl"], section["sourceUrl"])
            self.assertIn("oldid=", section["revisionUrl"])
            for line, before, after, scan in m.DANTE_REPAIRS.get(section["id"], []):
                self.assertEqual(lines[line-1], after)
                self.assertNotEqual(before, after)
                self.assertIn(f"buti-paradiso-scan-{scan}.jpg", ledger)
        last = data["sections"][-1]["passages"]
        self.assertTrue(last[0]["text"].startswith("Vergine Madre, fillia del tuo Fillio,"))
        self.assertTrue(last[-1]["text"].endswith("L’Amor, che muove ’l Sole e l’altre stelle."))
        self.assertGreater(len(last[-1]["text"].splitlines()), 1)

    @unittest.skipUnless(os.environ.get("CORPUS_FULL_REPLAY") == "1", "requires ignored acquisition caches")
    def test_full_replay_rejects_network_and_writes(self):
        with patch.object(m, "download", side_effect=AssertionError("network")), \
                patch.object(Path, "write_text", side_effect=AssertionError("write")), \
                patch.object(Path, "write_bytes", side_effect=AssertionError("write")), \
                contextlib.redirect_stdout(io.StringIO()):
            m.main(["--book", "divina-commedia", "--check"])

    def test_missing_recorded_cache_restores_only_matching_bytes_and_original_date(self):
        raw = b"retained acquisition"
        with tempfile.TemporaryDirectory() as directory, patch.object(m, "ROOT", Path(directory)):
            ledger = Path(directory) / "corpus/provenance/example.json"
            ledger.parent.mkdir(parents=True)
            record = {"sourceUrl":"https://example.org/source", "responseUrl":"https://example.org/source", "encoding":"utf-8", "retrievedOn":"2000-01-01", "sha256":m.sha256(raw)}
            ledger.write_text(m.serialized({"source.txt":record}))
            urls = {"source.txt": record["sourceUrl"]}
            with patch.object(m, "download", return_value=b"changed"):
                with self.assertRaisesRegex(ValueError, "provenance mismatch"):
                    m.Sources("example", urls)
            self.assertFalse((Path(directory) / ".cache").exists())
            with patch.object(m, "download", return_value=raw):
                restored = m.Sources("example", urls)
                self.assertEqual(restored.records["source.txt"], record)
                restored.save()
            self.assertEqual(json.loads(ledger.read_text())["source.txt"], record)


if __name__ == "__main__":
    unittest.main()
