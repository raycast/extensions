import assert from "node:assert/strict";
import {
  ayah_at,
  format_ayahs,
  normalize_cursor,
  parse_reference,
  quran_ayahs,
  search_ayahs,
} from "./quran";

assert.equal(quran_ayahs.length, 6236);
assert.ok(search_ayahs("مومن").length > 0);
assert.equal(search_ayahs("مومن", { simplify_words: false }).length, 0);
assert.ok(search_ayahs("الحمد", { harakat: "ignore" }).length > 0);
assert.equal(search_ayahs("الحمد", { harakat: "exact" }).length, 0);
assert.ok(search_ayahs("الحمد|الرحمن", { use_regex: true }).length > 0);
assert.equal(search_ayahs("الحمد|الرحمن", { use_regex: false }).length, 0);
assert.deepEqual(parse_reference("2:257-255"), {
  start_cursor: { surah_number: 2, ayah_number: 255 },
  end_cursor: { surah_number: 2, ayah_number: 257 },
});
assert.deepEqual(normalize_cursor(999, 999), {
  surah_number: 1,
  ayah_number: 1,
});
assert.match(
  String(
    format_ayahs(
      [ayah_at({ surah_number: 2, ayah_number: 255 })],
      {
        text_style: "uthmani",
        reference_style: "arabic",
        prefix: "none",
      },
      "plain",
    ),
  ),
  /^﴿[\s\S]+﴾\n\n\[البقرة: 255\]$/,
);

const asr_ayahs = [1, 2, 3].map((ayah_number) =>
  ayah_at({ surah_number: 103, ayah_number }),
);
assert.equal(
  format_ayahs(
    asr_ayahs,
    { text_style: "uthmani", reference_style: "arabic", prefix: "none" },
    "plain",
  ),
  `﴿${asr_ayahs[0].text} (١) ${asr_ayahs[1].text} (٢) ${asr_ayahs[2].text} (٣)﴾ [العصر: 1-3]`,
);

const sample_ayahs = [ayah_at({ surah_number: 1, ayah_number: 2 })];
const sample_options = {
  text_style: "imlai",
  reference_style: "arabic",
  prefix: "none",
} as const;
assert.match(
  String(format_ayahs(sample_ayahs, sample_options, "markdown")),
  /^> ﴿[\s\S]+﴾\n\n\*\*\[الفاتحة: 2\]\*\*$/,
);
assert.equal(
  format_ayahs(sample_ayahs, sample_options, "html"),
  '<div dir="rtl"><p>﴿الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ﴾</p>' +
    "<p>[الفاتحة: 2]</p></div>",
);
