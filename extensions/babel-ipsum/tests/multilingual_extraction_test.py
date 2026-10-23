"""Check multilingual source boundaries and the retained corpus contract offline."""

import hashlib
import importlib.util
import json
import re
import tempfile
from unittest.mock import patch
import unittest
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("import_multilingual", ROOT / "scripts/import-multilingual.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class MultilingualExtractionTests(unittest.TestCase):
    def test_chinese_preserves_verse_order_and_excludes_header(self):
        html = '''<div class="mw-parser-output"><div id="headerContainer"><p>頁首</p></div>
        <p>天地。\n 有情。</p><dl><dd>混沌未分天地亂，</dd><dd>茫茫渺渺無人見。</dd></dl>
        <p>後文。</p><div class="licenseContainer"><p>License</p></div></div>'''
        self.assertEqual(module.chinese_units(html), [
            (1, "天地。 有情。", "prose"),
            (2, "混沌未分天地亂，\n茫茫渺渺無人見。", "verse"),
            (3, "後文。", "prose"),
        ])

    def test_gutenberg_chinese_excludes_furniture_and_preserves_verse_only_breaks(self):
        html = '<p>Credits: Producer</p><p id="c1">第一回 開始</p>' \
               '<p>天\n地。人\n間。</p><p>詩曰：<br>山高，<br>水長。</p>' \
               '<p id="c10">第一○回 次回</p><p>故事。</p><p>《西遊記》至此終。</p>' \
               '<section id="pg-footer"><p>附加版權文字。</p></section>'
        chapters = module.gutenberg_chinese_chapters(html)
        self.assertEqual([c["anchor"] for c in chapters], ["c1", "c10"])
        self.assertEqual(chapters[0]["units"], [
            (1, "天地。人間。", "prose"), (2, "詩曰：\n山高，\n水長。", "verse"),
        ])
        self.assertEqual(chapters[1]["units"], [(1, "故事。", "prose")])

    def test_japanese_retains_ruby_base_and_decodes_explicit_gaiji(self):
        html = '''<div class="main_text"><div><h3>上　先生と私</h3></div>
        <div><h4><a id="midashi110">一</a></h4></div><br>
        　<ruby><rb>私</rb><rp>（</rp><rt>わたくし</rt><rp>）</rp></ruby>は先生と呼んだ。<br>
        　<img class="gaiji" src="../../../gaiji/1-84/1-84-77.png" alt="description">く。<br>
        <div><h4><a id="midashi120">二</a></h4></div><br>次。<br></div>'''
        result = module.japanese_sections(html)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0][3][0], (1, "私は先生と呼んだ。", "prose"))
        self.assertEqual(result[0][3][1], (2, "挘く。", "prose"))
        self.assertEqual(result[1][3], [(1, "次。", "prose")])

    def test_japanese_rejects_unidentified_inline_images(self):
        root = module.parse('<p><img class="gaiji" src="unknown.png" alt="similar character"></p>')
        with self.assertRaisesRegex(ValueError, "Unexpected inline image"):
            module.text(root)

    def test_hindi_excludes_title_page_and_keeps_nukta_danda(self):
        html = '''<div class="mw-parser-output"><p>गो - दान</p><p>लेखक</p><p>एक</p>
        <p>होरीराम ने दोनों बैलों को सानी-पानी दिया।</p>
        <p>ज़रा<span class="pagenum">9</span> मेरी लाठी दे दे।</p>
        <div class="noprint"><p>पिछला अध्याय</p></div></div>'''
        units = module.hindi_units(html, 1)
        self.assertEqual(units, [
            (1, "होरीराम ने दोनों बैलों को सानी-पानी दिया।", "prose"),
            (2, unicodedata.normalize("NFC", "ज़रा मेरी लाठी दे दे।"), "prose"),
        ])

    def test_sampling_never_truncates_repeats_or_reorders_units(self):
        units = [(i + 1, f"第{i}段。", "prose") for i in range(40)]
        result = module.sample(units, 100)
        self.assertEqual(result, module.sample(units, 100))
        self.assertLessEqual(sum(len(value.encode()) for _, value, _ in result), 100)
        self.assertGreaterEqual(len(result), 5)
        positions = [position for position, _, _ in result]
        self.assertEqual(positions, sorted(set(positions)))
        self.assertIn(units[0], result)
        self.assertIn(units[-1], result)
        self.assertTrue(all(unit in units for unit in result))

    def test_hindi_respects_chapter_bounds_orphan_text_and_ornaments(self):
        html = '''<div class="mw-parser-output"><div class="prp-pages-output">
        <p>Previous chapter fragment.</p><center>तेईस</center>
        <p>चुना हुआ पूरा अनुच्छेद।</p>यह बाहर का पूरा अनुच्छेद है।
        <p>...</p><p>— —</p><center>चौबीस</center><p>Next chapter fragment.</p>
        </div></div>'''
        self.assertEqual(module.hindi_units(html, 23), [
            (1, "चुना हुआ पूरा अनुच्छेद।", "prose"),
            (2, "यह बाहर का पूरा अनुच्छेद है।", "prose"),
        ])

    def test_hindi_reconstructs_mixed_indented_paragraphs_before_sampling(self):
        # Actual chapter 1 markup: sentence punctuation inside dd does not end
        # the paragraph, and consecutive dd elements are separate paragraphs.
        html = '''<div class="mw-parser-output"><center>एक</center>
        <dl><dd>भोला पर जो नशा चढ़ रहा था, उसे इस भरपूर प्याले ने और गहरा कर दिया।</dd></dl>
        <p>बोला-आदमी वही है, जो दूसरों की बहू-बेटी को अपनी बहू-बेटी समझे जो दुष्ट किसी
        मेहरिया की ओर ताके, उसे गोली मार देना चाहिए।</p>
        <dl><dd>‘यह तुमने लाख रुपये की बात कह दी भाई। बस सज्जन वही, जो दूसरों की आबरू</dd></dl>
        <p>समझे।'</p>
        <dl><dd>'अब मैं भी फिराक में रहूंगा। भगवान् चाहेंगे, तो जल्दी घर बस जायगा।'</dd>
        <dd>'बस, यही समझ लो कि उबर जाऊंगा भैया। घर में खाने को भगवान् का दिया बहुत</dd></dl>
        <p>है। चार पसेरी रोज दूध हो जाता है, लेकिन किस काम का?'</p>
        <dl><dd>अलग पूरा अनुच्छेद।<br /></dd></dl><p>अगला पूरा अनुच्छेद।</p>
        </div>'''
        units = module.hindi_units(html, 1)
        self.assertEqual([position for position, _, _ in units], list(range(1, 7)))
        self.assertEqual(units[0][1], "भोला पर जो नशा चढ़ रहा था, उसे इस भरपूर प्याले ने और गहरा कर दिया। बोला-आदमी वही है, जो दूसरों की बहू-बेटी को अपनी बहू-बेटी समझे जो दुष्ट किसी मेहरिया की ओर ताके, उसे गोली मार देना चाहिए।")
        complete = "‘यह तुमने लाख रुपये की बात कह दी भाई। बस सज्जन वही, जो दूसरों की आबरू समझे।'"
        self.assertEqual(units[1][1], complete)
        self.assertEqual(units[2][1], "'अब मैं भी फिराक में रहूंगा। भगवान् चाहेंगे, तो जल्दी घर बस जायगा।'")
        self.assertEqual(units[3][1], "'बस, यही समझ लो कि उबर जाऊंगा भैया। घर में खाने को भगवान् का दिया बहुत है। चार पसेरी रोज दूध हो जाता है, लेकिन किस काम का?'")
        self.assertEqual([value for _, value, _ in units[-2:]], ["अलग पूरा अनुच्छेद।", "अगला पूरा अनुच्छेद।"])
        # Compare every source character, ignoring only flattened layout space.
        source = module.text(module.content(module.parse(html))).replace("एक", "", 1)
        compact = lambda value: re.sub(r"\s+", "", module.normalize(value))
        self.assertEqual(compact(source), compact(" ".join(value for _, value, _ in units)))
        seen = False
        for allowance in range(0, sum(len(value.encode()) for _, value, _ in units) + 1, 31):
            for _, value, _ in module.sample(units, allowance):
                if "आबरू" in value or value == "समझे।'":
                    seen = True
                    self.assertEqual(value, complete)
        self.assertTrue(seen)

    def test_godaan_real_dd_p_fixture_preserves_every_character(self):
        fixtures = ROOT / "tests/fixtures/multilingual"
        html = (fixtures / "godaan-dd-p.html").read_text()
        expected = json.loads((fixtures / "godaan-dd-p.json").read_text())
        units = module.hindi_units(html, 1)
        self.assertEqual([list(unit) for unit in units], expected)
        self.assertEqual(html.count("<dd>"), 29)
        compact = lambda value: re.sub(r"\s+", "", module.normalize(value))
        source = module.text(module.content(module.parse(html))).replace("एक", "", 1)
        self.assertEqual(compact(source), compact(" ".join(value for _, value, _ in units)))
        self.assertNotIn("समझे।'", [value for _, value, _ in units])
        complete = "‘यह तुमने लाख रुपये की बात कह दी भाई। बस सज्जन वही, जो दूसरों की आबरू समझे।'"
        self.assertEqual(sum(value == complete for _, value, _ in units), 1)
        # Sampling must retain this reconstructed paragraph as one complete unit.
        selected = module.sample(units, module.TARGET_BYTES // 12)
        self.assertIn(complete, [value for _, value, _ in selected])
        data = json.loads((ROOT / "corpus/books/godaan.json").read_text())
        self.assertEqual(sum(p["text"] == complete for p in data["sections"][0]["passages"]), 1)
        self.assertLessEqual(sum(len(p["text"].encode()) for section in data["sections"]
                                 for p in section["passages"]), module.TARGET_BYTES)

    def test_snapshot_replay_rejects_byte_or_source_url_changes(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(module, "ROOT", Path(directory)):
            snapshots = module.Snapshots("fixture")
            raw = "字".encode("shift_jis")
            snapshots.record("source.html", {
                "sourceUrl": "https://example.org/source", "encoding": "shift_jis",
                "retrievedOn": "2026-10-22", "sha256": hashlib.sha256(raw).hexdigest(),
            })
            snapshots.directory.mkdir(parents=True)
            (snapshots.directory / "source.html").write_bytes(raw)
            self.assertEqual(snapshots.get("source.html", "https://example.org/source")[0], "字")
            with self.assertRaisesRegex(ValueError, "provenance mismatch"):
                snapshots.get("source.html", "https://example.org/other")
            (snapshots.directory / "source.html").write_bytes(raw + b"\n")
            with self.assertRaisesRegex(ValueError, "provenance mismatch"):
                snapshots.get("source.html", "https://example.org/source")

    def test_all_seven_books_retain_source_hashes_and_required_metadata(self):
        required = {
            "id", "title", "author", "language", "locale", "direction", "sourceUrl",
            "edition", "scope", "license", "attribution", "editorialNote", "sentenceSeparator",
        }
        for book_id in module.BOOK_IDS:
            with self.subTest(book=book_id):
                path = ROOT / "corpus/books" / f"{book_id}.json"
                self.assertTrue(path.exists(), f"Missing owned book: {book_id}")
                data = json.loads(path.read_text())
                self.assertEqual(data["schemaVersion"], 1)
                self.assertEqual(data["book"]["id"], book_id)
                self.assertTrue(required.issubset(data["book"]))
                self.assertTrue(all(isinstance(data["book"][key], str) for key in required))
                self.assertRegex(data["retrievedOn"], r"^\d{4}-\d{2}-\d{2}$")
                self.assertIn(data["book"]["sentenceSeparator"], {"", " "})
                self.assertEqual(data["book"]["direction"], "rtl" if book_id == "the-broken-wings" else "ltr")
                ledger = json.loads((ROOT / "corpus/provenance" / f"{book_id}.json").read_text())
                records = ({Path(item["snapshotPath"]).name: item for item in ledger["snapshots"]}
                           if "snapshots" in ledger else ledger)
                self.assertTrue(records)
                for record in records.values():
                    self.assertRegex(record["retrievedOn"], r"^\d{4}-\d{2}-\d{2}$")
                    self.assertTrue(record["encoding"])
                    self.assertRegex(record.get("sha256", record.get("snapshotSha256")), r"^[a-f0-9]{64}$")
                if book_id == "kokoro":
                    self.assertEqual(records["773_14560.html"]["encoding"], "shift_jis")
                sections = data["sections"]
                self.assertEqual([s["position"] for s in sections], sorted({s["position"] for s in sections}))
                self.assertEqual(len({s["id"] for s in sections}), len(sections))
                total = 0
                for section in sections:
                    snapshot = Path(section["snapshotPath"])
                    self.assertEqual(snapshot.parent.as_posix(), f".cache/corpus/sources/{book_id}")
                    record = records[snapshot.name]
                    self.assertEqual(record.get("sha256", record.get("snapshotSha256")), section["snapshotSha256"])
                    self.assertEqual(record["sourceUrl"].split("#")[0], section["sourceUrl"].split("#")[0])
                    self.assertTrue(section["revisionUrl"].startswith("https://"))
                    passages = section["passages"]
                    self.assertEqual([p["position"] for p in passages], sorted({p["position"] for p in passages}))
                    for passage in passages:
                        total += 1
                        self.assertTrue(passage["text"].strip())
                        self.assertTrue(any(unicodedata.category(c).startswith("L") for c in passage["text"]))
                        self.assertEqual(passage["text"], unicodedata.normalize("NFC", passage["text"]))
                        self.assertIn(passage["kind"], {"prose", "verse", "speech"})
                        if passage["kind"] == "prose":
                            self.assertNotIn("\n", passage["text"])
                self.assertGreaterEqual(total, 10)


if __name__ == "__main__":
    unittest.main()
