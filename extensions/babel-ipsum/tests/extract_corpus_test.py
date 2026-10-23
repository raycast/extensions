"""Behavior checks for source extraction across Wikisource page layouts."""

import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("extract_corpus", Path(__file__).resolve().parents[1] / "scripts/extract-corpus.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ExtractionTests(unittest.TestCase):
    def test_extracts_prose_and_excludes_page_furniture(self):
        paragraphs = "".join(f"<p>Texto {i}<span class='pagenum'>99</span> completo.</p>" for i in range(10))
        html = f'''<html about="/revision/123"><body>
          <div class="mw-parser-output"><span>Page badge</span></div>
          <div class="mw-parser-output"><div id="headertemplate"><p>Header</p></div>
          <h2>Story title</h2>{paragraphs}<p>Una línea.<br><br>Otro párrafo.</p>
          <div class="references"><p>Footnote</p></div></div></body></html>'''
        result = module.extract_story({"slug": "fixture"}, html)
        self.assertEqual(len(result["paragraphs"]), 12)
        self.assertEqual(result["paragraphs"][0], "Texto 0 completo.")
        self.assertEqual(result["paragraphs"][-2:], ["Una línea.", "Otro párrafo."])
        self.assertEqual(result["revisionUrl"], "https://es.wikisource.org/w/index.php?oldid=123")

    def test_fails_on_missing_or_incomplete_source(self):
        with self.assertRaisesRegex(ValueError, "no MediaWiki"):
            module.extract_story({"slug": "fixture"}, "<html>Blocked</html>")
        with self.assertRaisesRegex(ValueError, "unexpectedly short"):
            module.extract_story({"slug": "fixture"}, '<div class="mw-parser-output"><p>Incomplete.</p></div>')


if __name__ == "__main__":
    unittest.main()
