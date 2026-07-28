"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const quran_1 = require("./quran");
strict_1.default.equal(quran_1.quran_ayahs.length, 6236);
strict_1.default.ok((0, quran_1.search_ayahs)("مومن").length > 0);
strict_1.default.equal((0, quran_1.search_ayahs)("مومن", { simplify_words: false }).length, 0);
strict_1.default.ok((0, quran_1.search_ayahs)("الحمد", { harakat: "ignore" }).length > 0);
strict_1.default.equal((0, quran_1.search_ayahs)("الحمد", { harakat: "exact" }).length, 0);
strict_1.default.ok((0, quran_1.search_ayahs)("الحمد|الرحمن", { use_regex: true }).length > 0);
strict_1.default.equal((0, quran_1.search_ayahs)("الحمد|الرحمن", { use_regex: false }).length, 0);
strict_1.default.deepEqual((0, quran_1.parse_reference)("2:257-255"), {
    start_cursor: { surah_number: 2, ayah_number: 255 },
    end_cursor: { surah_number: 2, ayah_number: 257 },
});
strict_1.default.deepEqual((0, quran_1.normalize_cursor)(999, 999), {
    surah_number: 1,
    ayah_number: 1,
});
strict_1.default.match(String((0, quran_1.format_ayahs)([(0, quran_1.ayah_at)({ surah_number: 2, ayah_number: 255 })], {
    text_style: "uthmani",
    reference_style: "arabic",
    prefix: "none",
}, "plain")), /^﴿[\s\S]+﴾\n\n\[البقرة: 255\]$/);
const sample_ayahs = [(0, quran_1.ayah_at)({ surah_number: 1, ayah_number: 2 })];
const sample_options = {
    text_style: "imlai",
    reference_style: "arabic",
    prefix: "none",
};
strict_1.default.match(String((0, quran_1.format_ayahs)(sample_ayahs, sample_options, "markdown")), /^> ﴿[\s\S]+﴾\n\n\*\*\[الفاتحة: 2\]\*\*$/);
strict_1.default.equal((0, quran_1.format_ayahs)(sample_ayahs, sample_options, "html"), '<div dir="rtl"><p>﴿الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ﴾</p>' +
    "<p>[الفاتحة: 2]</p></div>");
