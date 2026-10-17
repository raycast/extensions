"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quran_ayahs = exports.surah_list = exports.suwar = void 0;
exports.strip_harakat = strip_harakat;
exports.normalize_searchable_text = normalize_searchable_text;
exports.get_ayah_id = get_ayah_id;
exports.normalize_cursor = normalize_cursor;
exports.normalize_range = normalize_range;
exports.ayah_at = ayah_at;
exports.ayahs_in_range = ayahs_in_range;
exports.ayahs_in_surah = ayahs_in_surah;
exports.search_ayahs = search_ayahs;
exports.search_surahs = search_surahs;
exports.parse_reference = parse_reference;
exports.format_reference = format_reference;
exports.format_ayahs = format_ayahs;
exports.ayah_title = ayah_title;
exports.ayah_subtitle = ayah_subtitle;
exports.quran_com_url = quran_com_url;
const quran_json_1 = __importDefault(require("../data/quran.json"));
// prettier-ignore
exports.suwar = [[7, "الفاتحة"], [286, "البقرة"], [200, "آل عمران"], [176, "النساء"], [120, "المائدة"], [165, "الأنعام"], [206, "الأعراف"], [75, "الأنفال"], [129, "التوبة"], [109, "يونس"], [123, "هود"], [111, "يوسف"], [43, "الرعد"], [52, "إبراهيم"], [99, "الحجر"], [128, "النحل"], [111, "الإسراء"], [110, "الكهف"], [98, "مريم"], [135, "طه"], [112, "الأنبياء"], [78, "الحج"], [118, "المؤمنون"], [64, "النور"], [77, "الفرقان"], [227, "الشعراء"], [93, "النمل"], [88, "القصص"], [69, "العنكبوت"], [60, "الروم"], [34, "لقمان"], [30, "السجدة"], [73, "الأحزاب"], [54, "سبأ"], [45, "فاطر"], [83, "يس"], [182, "الصافات"], [88, "ص"], [75, "الزمر"], [85, "غافر"], [54, "فصلت"], [53, "الشورى"], [89, "الزخرف"], [59, "الدخان"], [37, "الجاثية"], [35, "الأحقاف"], [38, "محمد"], [29, "الفتح"], [18, "الحجرات"], [45, "ق"], [60, "الذاريات"], [49, "الطور"], [62, "النجم"], [55, "القمر"], [78, "الرحمن"], [96, "الواقعة"], [29, "الحديد"], [22, "المجادلة"], [24, "الحشر"], [13, "الممتحنة"], [14, "الصف"], [11, "الجمعة"], [11, "المنافقون"], [18, "التغابن"], [12, "الطلاق"], [12, "التحريم"], [30, "الملك"], [52, "القلم"], [52, "الحاقة"], [44, "المعارج"], [28, "نوح"], [28, "الجن"], [20, "المزمل"], [56, "المدثر"], [40, "القيامة"], [31, "الإنسان"], [50, "المرسلات"], [40, "النبأ"], [46, "النازعات"], [42, "عبس"], [29, "التكوير"], [19, "الانفطار"], [36, "المطففين"], [25, "الانشقاق"], [22, "البروج"], [17, "الطارق"], [19, "الأعلى"], [26, "الغاشية"], [30, "الفجر"], [20, "البلد"], [15, "الشمس"], [21, "الليل"], [11, "الضحى"], [8, "الشرح"], [8, "التين"], [19, "العلق"], [5, "القدر"], [8, "البينة"], [8, "الزلزلة"], [11, "العاديات"], [11, "القارعة"], [8, "التكاثر"], [3, "العصر"], [9, "الهمزة"], [5, "الفيل"], [4, "قريش"], [7, "الماعون"], [3, "الكوثر"], [6, "الكافرون"], [3, "النصر"], [5, "المسد"], [4, "الإخلاص"], [5, "الفلق"], [6, "الناس"]];
const abs_ayahs = (() => {
    let count = 0;
    return exports.suwar.map(([ayah_count]) => {
        const result = count;
        count += ayah_count;
        return result;
    });
})();
const harakat_range = "[ً-ْۖ-ٰۜ]*";
const multi_match_map = {
    ا: "اأإآٱ",
    أ: "اأإآٱ",
    إ: "اأإآٱ",
    آ: "اأإآٱ",
    ٱ: "اأإآٱ",
    ي: "ييىئ",
    ى: "ييىئ",
    ئ: "ييىئ",
    ه: "هة",
    ة: "هة",
    و: "وؤ",
    ؤ: "ؤو",
};
const multi_match_re = RegExp(`[${Object.keys(multi_match_map).join("")}]`, "g");
exports.surah_list = exports.suwar.map(([ayah_count, name], index) => ({
    number: index + 1,
    name,
    ayah_count,
    search_text: normalize_searchable_text(`${index + 1} ${name}`),
}));
exports.quran_ayahs = quran_json_1.default.map(([text, text_imlai], index) => {
    const ayah_id = index + 1;
    const [surah_number, ayah_number] = get_surah_ayah(ayah_id);
    return { ayah_id, surah_number, ayah_number, text, text_imlai };
});
function strip_harakat(value = "") {
    return value
        .normalize("NFKC")
        .replace(/[\u0640]/g, "")
        .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g, "");
}
function normalize_searchable_text(value = "") {
    return strip_harakat(value)
        .toLowerCase()
        .replace(/[أإآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/ء/g, "")
        .replace(/ة/g, "ه")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function get_ayah_id(surah_number, ayah_number) {
    return abs_ayahs[surah_number - 1] + Number(ayah_number);
}
function get_surah_ayah(ayah_id) {
    let index = 0;
    while (ayah_id > exports.suwar[index][0]) {
        ayah_id -= exports.suwar[index][0];
        index++;
    }
    return [index + 1, ayah_id];
}
function is_valid_cursor(surah_number, ayah_number) {
    if (!Number.isInteger(surah_number) ||
        surah_number < 1 ||
        surah_number > exports.surah_list.length)
        return false;
    return (Number.isInteger(ayah_number) &&
        ayah_number >= 1 &&
        ayah_number <= exports.surah_list[surah_number - 1].ayah_count);
}
function normalize_cursor(surah_number, ayah_number) {
    const s = Number(surah_number);
    const a = Number(ayah_number);
    if (!is_valid_cursor(s, a))
        return { surah_number: 1, ayah_number: 1 };
    return { surah_number: s, ayah_number: a };
}
function normalize_range(start_cursor, end_cursor) {
    const start = normalize_cursor(start_cursor.surah_number, start_cursor.ayah_number);
    const end = normalize_cursor(end_cursor.surah_number, end_cursor.ayah_number);
    const start_id = get_ayah_id(start.surah_number, start.ayah_number);
    const end_id = get_ayah_id(end.surah_number, end.ayah_number);
    return start_id <= end_id
        ? { start_cursor: start, end_cursor: end }
        : { start_cursor: end, end_cursor: start };
}
function ayah_at(cursor) {
    const normalized = normalize_cursor(cursor.surah_number, cursor.ayah_number);
    return exports.quran_ayahs[get_ayah_id(normalized.surah_number, normalized.ayah_number) - 1];
}
function ayahs_in_range(start_cursor, end_cursor) {
    const range = normalize_range(start_cursor, end_cursor);
    return exports.quran_ayahs.slice(get_ayah_id(range.start_cursor.surah_number, range.start_cursor.ayah_number) - 1, get_ayah_id(range.end_cursor.surah_number, range.end_cursor.ayah_number));
}
function ayahs_in_surah(surah_number) {
    const surah = exports.surah_list[surah_number - 1];
    if (!surah)
        return [];
    return ayahs_in_range({ surah_number: surah.number, ayah_number: 1 }, { surah_number: surah.number, ayah_number: surah.ayah_count });
}
function search_ayahs(query, options = {}, limit = 30) {
    const pattern = build_search_pattern(query, {
        use_regex: Boolean(options.use_regex),
        simplify_words: options.simplify_words !== false,
        harakat: options.harakat || "ignore",
    });
    if (!pattern)
        return [];
    let regex;
    try {
        regex = new RegExp(pattern, "iu");
    }
    catch {
        return [];
    }
    return exports.quran_ayahs
        .filter((ayah) => regex.test(ayah.text_imlai))
        .slice(0, limit);
}
function search_surahs(query) {
    const normalized = normalize_searchable_text(query);
    if (!normalized)
        return exports.surah_list;
    return exports.surah_list.filter((surah) => surah.search_text.includes(normalized));
}
function parse_reference(raw) {
    const query = to_ascii_digits(raw.trim());
    const numeric = query.match(/^(\d{1,3})\s*[:： ]\s*(\d{1,3})(?:\s*[-–—]\s*(?:(\d{1,3})\s*[:： ])?(\d{1,3}))?$/);
    if (numeric) {
        const start_cursor = normalize_cursor(numeric[1], numeric[2]);
        const end_cursor = normalize_cursor(numeric[3] || numeric[1], numeric[4] || numeric[2]);
        return normalize_range(start_cursor, end_cursor);
    }
    const named = query.match(/^(.+?)\s+(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?$/);
    const surah = named ? find_surah(named[1]) : undefined;
    if (!named || !surah)
        return undefined;
    return normalize_range(normalize_cursor(surah.number, named[2]), normalize_cursor(surah.number, named[3] || named[2]));
}
function format_reference(start, end, style) {
    if (style === "none")
        return "";
    const same_ayah = start.surah_number === end.surah_number &&
        start.ayah_number === end.ayah_number;
    const numeric = same_ayah
        ? `${start.surah_number}:${start.ayah_number}`
        : start.surah_number === end.surah_number
            ? `${start.surah_number}:${start.ayah_number}-${end.ayah_number}`
            : `${start.surah_number}:${start.ayah_number}-${end.surah_number}:${end.ayah_number}`;
    if (style === "quran")
        return `Quran ${numeric}`;
    if (style === "arabic") {
        const name = exports.surah_list[start.surah_number - 1].name;
        const value = same_ayah || start.surah_number === end.surah_number
            ? `${name}: ${same_ayah ? start.ayah_number : `${start.ayah_number}-${end.ayah_number}`}`
            : `${name}: ${start.ayah_number}-${exports.surah_list[end.surah_number - 1].name}: ${end.ayah_number}`;
        return `[${value}]`;
    }
    return `(${numeric})`;
}
function format_ayahs(ayahs, options, format) {
    const text_lines = ayahs.map((ayah) => wrap_ayah(ayah_text(ayah, options.text_style)));
    const range = normalize_range(ayahs[0], ayahs[ayahs.length - 1]);
    const reference = format_reference(range.start_cursor, range.end_cursor, options.reference_style);
    const prefix = prefix_text(options.prefix);
    const plain = [prefix, text_lines.join("\n"), reference]
        .filter(Boolean)
        .join("\n\n");
    if (format === "plain")
        return plain;
    if (format === "markdown") {
        const quote = text_lines.map((line) => `> ${line}`).join("\n>\n");
        return [prefix, quote, reference && `**${reference}**`]
            .filter(Boolean)
            .join("\n\n");
    }
    return `<div dir="rtl">${prefix ? `<p>${escape_html(prefix)}</p>` : ""}${text_lines
        .map((line) => `<p>${escape_html(line)}</p>`)
        .join("")}${reference ? `<p>${escape_html(reference)}</p>` : ""}</div>`;
}
function ayah_title(ayah, style) {
    return wrap_ayah(ayah_text(ayah, style)).slice(0, 120);
}
function ayah_subtitle(ayah) {
    return `${exports.surah_list[ayah.surah_number - 1].name} ${ayah.ayah_number}`;
}
function quran_com_url(cursor) {
    return `https://quran.com/${cursor.surah_number}/${cursor.ayah_number}`;
}
function build_search_pattern(query, options) {
    const raw_query = String(query || "").trim();
    if (raw_query.length < 2)
        return "";
    let pattern = options.use_regex ? raw_query : escape_regex(raw_query);
    if (options.harakat === "ignore")
        pattern = strip_harakat(pattern).replace(/[\u0621-\u064A]/g, "$&" + harakat_range);
    if (options.harakat === "existing_only")
        pattern = pattern.replace(/[\u0621-\u064A](?![\u064B-\u0652])/g, "$&" + harakat_range);
    if (options.simplify_words)
        pattern = pattern.replace(multi_match_re, (match) => `[${multi_match_map[match]}]`);
    return pattern;
}
function escape_regex(value) {
    return value.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
function to_ascii_digits(value) {
    return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}
function find_surah(value) {
    const query = normalize_searchable_text(value);
    return exports.surah_list.find((surah) => surah.search_text === query || surah.search_text.includes(query));
}
function ayah_text(ayah, style) {
    return style === "imlai" ? ayah.text_imlai : ayah.text;
}
function prefix_text(prefix) {
    if (prefix === "qaal")
        return "قال تعالى:";
    if (prefix === "istiadhah")
        return "أعوذ بالله من الشيطان الرجيم";
    if (prefix === "basmalah")
        return "بسم الله الرحمن الرحيم";
    return "";
}
function wrap_ayah(value) {
    return `﴿${value}﴾`;
}
function escape_html(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
