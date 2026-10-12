import Foundation
import Testing
@testable import DigUpKit

@Suite struct SearchTextTests {
    let folder: URL = {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("DigUpTests-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }()

    @Test func normalizedFoldsWhatIsTypedDifferently() {
        #expect(SearchText.normalized("الْمَكْتَبَةَ") == "المكتبة")              // harakat
        #expect(SearchText.normalized("إلى الأردن") == "الى الاردن")              // alef forms
        #expect(SearchText.normalized("مـــرحبا") == "مرحبا")                      // tatweel
        #expect(SearchText.normalized("\u{FEFB}") == "\u{0644}\u{0627}")           // the lam-alef ligature → lam, alef
        #expect(SearchText.normalized("\u{FB01}le") == "file")                     // ﬁ
        #expect(SearchText.normalized("র\u{200D}্যাব") == "র্যাব")                  // zero-width joiner
        #expect(SearchText.normalized("\u{09C7}\u{09BE}") == "\u{09CB}")           // ে + া → ো
        #expect(SearchText.normalized("a\u{200B}b") == "a b")                      // zero-width space breaks words
    }

    @Test func queryWordsOfLanguagesWithEndingsArePrefixes() {
        #expect(Searcher.ftsQuery("কুমির") == "\"কুমির\"*")
        #expect(Searcher.ftsQuery("مدرسة الأطفال") == "\"مدرسة\"* OR \"الاطفال\"*")
        #expect(Searcher.ftsQuery("মা") == "\"মা\"*")   // a letter and its vowel sign: two, so it counts
        #expect(Searcher.ftsQuery("payment error") == "\"payment\" OR \"error\"")
        #expect(Searcher.kindHints("জেব্রার ভিডিওতে") == [.video])
        #expect(Searcher.kindHints("صورة حمار وحشي") == [.image])
    }

    @Test func bengaliAndArabicWordsStayWhole() throws {
        let store = try IndexStore(directory: folder)
        let id = try store.insert(Candidate(path: "/notes/trip.txt", kind: .doc, size: 1, mtime: 1, inode: 1, device: 1))
        try store.addSegment(file: id, kind: .chunk, modality: .text, loc: 1,
                             text: "সুন্দরবনে আমরা কুমিরও দেখেছি। قَالَ إِنَّ الْمَكْتَبَةَ تُغْلَقُ")
        let searcher = try Searcher(store: store, loadVectors: false)
        let bengali = try searcher.search("কুমির", queryVector: nil)
        #expect(bengali.map(\.path) == ["/notes/trip.txt"])
        #expect(bengali.first?.excerpt?.contains("«কুমিরও»") == true)   // the whole word, never a piece of it
        #expect(try searcher.search("المكتبة", queryVector: nil).map(\.path) == ["/notes/trip.txt"])
        #expect(try searcher.search("কলকাতা", queryVector: nil).isEmpty)
    }

    @Test func garbledPageTextIsNoticed() {
        // As PDFKit reads Bengali and Arabic pages made by Quartz/WebKit (testbed/make_lang.swift).
        let glyphOrder = "বািড় ভাড়ার চিপ ধানমি ৭ নর রােডর িতন বডরেমর াট মািসক ২৫,০০০ টাকা ভাড়ায় দওয়া হেলা। ভাড়ায়া দুই মােসর"
        let bengali = "বাড়ি ভাড়ার চুক্তিপত্র। ধানমন্ডি ৭ নম্বর রোডের তিন বেডরুমের ফ্ল্যাটটি মাসিক ২৫,০০০ টাকা ভাড়ায় দেওয়া হলো।"
        let lost = "ارتفعت ا.بيعات بنسبة خمسة عشر با.ئة في الربع الثالث. زرنا مدينة البتراء ا?ثرية في جنوب ا?ردن."
        let arabic = "ارتفعت المبيعات بنسبة خمسة عشر بالمئة في الربع الثالث. زرنا مدينة البتراء الأثرية في جنوب الأردن."
        #expect(PageTextProblem.check(glyphOrder) == .glyphOrder)
        #expect(PageTextProblem.check(bengali) == nil)
        #expect(PageTextProblem.check(lost) == .lostLetters)
        #expect(PageTextProblem.check(arabic) == nil)
        #expect(PageTextProblem.check("Revenue grew 20%. See p.4?No. Done.") == nil)
    }

    @Test func schemaOneMigratesToTheCurrentSchema() throws {
        // An index as schema 1 made it: SQLite's default tokenizer, text as extracted, screenshots' OCR with a vector,
        // its vectors named by the llama.cpp build.
        let built = "google/embeddinggemma-2@bfcd298 llama.cpp-b11461-metal text-q8_0+mmproj-q8_0"
        let db = try Database(path: folder.appendingPathComponent("index.sqlite").path)
        try db.execute("""
            CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE files(id INTEGER PRIMARY KEY, path TEXT NOT NULL UNIQUE, kind TEXT NOT NULL,
                size INTEGER NOT NULL, mtime REAL NOT NULL, inode INTEGER NOT NULL, device INTEGER NOT NULL,
                state TEXT NOT NULL DEFAULT 'pending', detail TEXT, info TEXT, indexed_at REAL);
            CREATE TABLE segments(id INTEGER PRIMARY KEY, file INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
                kind TEXT NOT NULL, modality TEXT NOT NULL, loc REAL, loc_end REAL, excerpt TEXT, vec BLOB);
            CREATE VIRTUAL TABLE fts USING fts5(name, body, tokenize = 'porter unicode61 remove_diacritics 2');
            INSERT INTO files VALUES(1, '/d/notes.txt', 'doc', 1, 1, 1, 1, 'done', NULL, NULL, 1);
            INSERT INTO segments VALUES(1, 1, 'chunk', 'text', 1, NULL, NULL, NULL);
            INSERT INTO fts(rowid, name, body) VALUES(1, '', 'قَالَ إِنَّ الْمَكْتَبَةَ تُغْلَقُ');
            INSERT INTO files VALUES(2, '/d/rent.pdf', 'pdf', 1, 1, 2, 1, 'done', NULL, NULL, 1);
            INSERT INTO segments VALUES(2, 2, 'page', 'text', 1, NULL, NULL, NULL);
            INSERT INTO fts(rowid, name, body) VALUES(2, '', 'বািড় ভাড়ার চিপ ধানমি ৭ নর রােডর িতন বডরেমর াট মািসক ২৫,০০০ টাকা ভাড়ায় দওয়া হেলা।');
            INSERT INTO files VALUES(3, '/d/shot.png', 'screenshot', 1, 1, 3, 1, 'done', NULL, NULL, 1);
            INSERT INTO segments VALUES(3, 3, 'ocr', 'text', NULL, NULL, 'Booking K7Q2LM', zeroblob(1536));
            INSERT INTO fts(rowid, name, body) VALUES(3, '', 'Booking K7Q2LM');
            INSERT INTO meta VALUES('fingerprint', '\(built) | photo140 shot280 page280 frame70/3.0s audio30.0/25.0s');
            INSERT INTO meta VALUES('vector_source', '\(built)');
            PRAGMA user_version = 1;
            """)
        let store = try IndexStore(directory: folder)
        var version: Int64 = 0
        try store.db.query("PRAGMA user_version") { version = $0.int(0) }
        #expect(version == IndexStore.schemaVersion)
        let searcher = try Searcher(store: store, loadVectors: false)
        #expect(try searcher.search("المكتبة", queryVector: nil).map(\.path) == ["/d/notes.txt"])
        #expect(try store.pending(limit: nil).map(\.path) == ["/d/rent.pdf"])   // to be read again, as a picture
        // Schema 3: the screenshot's words are for keyword search only.
        var vectors = -1
        try store.db.query("SELECT COUNT(vec) FROM segments WHERE kind = 'ocr'") { vectors = Int($0.int(0)) }
        #expect(vectors == 0)
        #expect(try searcher.search("K7Q2LM", queryVector: nil).map(\.path) == ["/d/shot.png"])
        // Schema 4: the vectors are named by their version, not by the llama.cpp build that made them.
        let named = "google/embeddinggemma-2@bfcd298 llama.cpp-vectors1 text-q8_0+mmproj-q8_0"
        #expect(try store.meta("vector_source") == named)
        #expect(try store.meta("fingerprint")?.hasPrefix(named + " | ") == true)
        // Schema 5 (long files finished later, `LongFilesTests`) leaves short ones as they were.
        #expect(try store.unfinishedCount() == (0, 0))
    }

    @Test func landmarkFindsThePageInPreview() {
        let pages = ["Quarterly business review\nRevenue grew in Japan and Europe.",
                     "Hiking trip to Mount Fuji\nWe took the Yoshida trail from the fifth station in Japan."]
        // A word that's on that page, preferring one that isn't on an earlier page…
        #expect(Landmark.find(page: 2, texts: pages, words: ["japan", "Yoshida"]) == "Yoshida")
        // …else any that is.
        #expect(Landmark.find(page: 2, texts: pages, words: ["japan", "bread"]) == "Japan")
        #expect(Landmark.find(page: 2, texts: pages, words: ["bread"]) == nil)
        #expect(Landmark.find(page: 1, texts: pages, words: ["japan"]) == nil)   // opens there anyway
        // Spelled as the page spells it; a word a garbled text layer lost isn't offered.
        let arabic = ["التقرير الربعي", "رحلة إلى البتراء\nزرنا مدينة البتراء الأثرية في جنوب الأردن"]
        #expect(Landmark.find(page: 2, texts: arabic, words: ["الاردن"]) == "الأردن")
        let garbled = ["التقرير الربعي", "زرنا مدينة البتراء ا?ثرية في جنوب ا?ردن"]
        #expect(Landmark.find(page: 2, texts: garbled, words: ["الاردن"]) == nil)
    }

    @Test func matchesAreFoundAsKeywordSearchFindsThemButShownAsWritten() {
        let arabic = "زرنا مدينة البتراء الأثرية في جنوب الأردن."
        let found = SearchText.matches(of: "الاردن", in: arabic).map { String(arabic[$0]) }
        #expect(found == ["الأردن"])                                     // the hamza is kept: it's how it's written
        let voweled = "إِنَّ الْمَكْتَبَةَ تُغْلَقُ"
        #expect(SearchText.matches(of: "المكتبة", in: voweled).map { String(voweled[$0]) } == ["الْمَكْتَبَةَ"])
        let bengali = "একটি বড় কুমিরের ছবি"
        #expect(SearchText.matches(of: "কুমির", in: bengali).map { String(bengali[$0]) } == ["কুমিরের"])   // never "কুমি"
        let english = "Sunday trip: day two"
        #expect(SearchText.matches(of: "day", in: english).map { String(english[$0]) } == ["day"])   // not in "Sunday"
        let turkish = String(repeating: "İ", count: 60) + " son kelime"
        #expect(SearchText.matches(of: "kelime", in: turkish).map { String(turkish[$0]) } == ["kelime"])
    }

    @Test func snippetsQuoteTheTextAsWritten() {
        let text = "قَالَ مُحَمَّدٌ إِنَّ الْمَكْتَبَةَ الْعَامَّةَ تُغْلَقُ فِي السَّاعَةِ الثَّامِنَةِ مَسَاءً يَوْمَ الْخَمِيسِ"
        let snippet = SearchText.snippet(text, terms: ["المكتبة"])
        #expect(snippet?.contains("«الْمَكْتَبَةَ»") == true)
        #expect(SearchText.snippet(text, terms: ["كلمة"]) == nil)
    }

    @Test func realArabicAbbreviationsAreNotLostLetters() {
        #expect(PageTextProblem.check("أ.د.محمد علي، أستاذ في الجامعة. د.خالد و د.سارة من شركة ذ.م.م للتجارة") == nil)
        let bullets = String(repeating: "\u{F0B7} Item one of the slide\n", count: 6)
        #expect(PageTextProblem.check(bullets) == nil)
    }
}
