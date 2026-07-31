import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { telexTransform } from "./telex.js";

// prettier-ignore
const testCases = [
  // Basic word + tone
  ["cais",                      "cái"],
  ["gif",                       "gì"],
  ["nhaf",                      "nhà"],
  ["nhas",                      "nhá"],
  ["nhar",                      "nhả"],
  ["nhax",                      "nhã"],
  ["nhaj",                      "nhạ"],

  // Tone marker before final consonant
  ["befn",                      "bèn"],
  ["toafn",                     "toàn"],
  ["giojt",                     "giọt"],
  ["giotj",                     "giọt"],
  ["toanf",                     "toàn"],
  ["majy",                      "mạy"],

  // Scan-back modifier: w reaches past consonants to modify earlier vowel
  ["changwr",                   "chẳng"],
  ["thangwr",                   "thẳng"],

  // uo + w → ươ (horn on both u and o)
  ["muonwj",                    "mượn"],
  ["nguoiwf",                   "người"],
  ["tuoiwf",                    "tười"],

  // ua + w → ưa (w prefers u over a to form ưa diphthong)
  ["cuawr",                     "cửa"],
  ["cuaws",                     "cứa"],
  ["cuawf",                     "cừa"],
  ["muaws",                     "mứa"],

  // Jump-over semivowel modifier (ay + a → ây)
  ["vayaj",                     "vậy"],
  ["cayaj",                     "cậy"],
  ["dayaj",                     "dậy"],
  ["ddayaj",                    "đậy"],

  // Two-letter modifier
  ["baan",                      "bân"],
  ["dee",                       "dê"],
  ["doo",                       "dô"],
  ["ddi",                       "đi"],

  // w modifier
  ["caw",                       "că"],
  ["tuws",                      "tứ"],
  ["mow",                       "mơ"],

  // Tone on second vowel (glide + vowel)
  ["tieengs",                   "tiếng"],
  ["chuaanr",                   "chuẩn"],
  ["hoawcj",                    "hoặc"],
  ["cuas",                      "cúa"],
  ["hoar",                      "hỏa"],

  // Multi-word
  ["cais gif vayaj",            "cái gì vậy"],
  ["tieengs vieetj",            "tiếng việt"],

  // Edge cases
  ["",                          ""],
  ["bus",                       "bú"],
  ["hello",                     "hello"],
  ["ban",                       "ban"],
  ["NHAS",                      "NHÁ"],

  // ── Onset check: invalid Vietnamese onsets → skip ──
  ["status",                    "status"],
  ["proof",                     "proof"],
  ["stress",                    "stress"],
  ["class",                     "class"],
  ["fix",                       "fix"],
  ["start",                     "start"],
  ["float",                     "float"],
  ["bravo",                     "bravo"],
  ["for",                       "for"],
  // NOTE: "if" and "of" are valid single-vowel Vietnamese syllables (ì, ò).
  // Without skipWords, the transform applies tone. The extension uses skipWords.
  ["if",                        "ì"],
  ["of",                        "ò"],

  // ── Foreign words with valid onset but invalid syllable structure ──
  ["catcher",                  "catcher"],
  ["teacher",                  "teacher"],
  ["search",                   "search"],
  ["beach",                    "beach"],
  ["you",                      "you"],
  ["house",                    "house"],
  ["your",                     "your"],
  ["beyond",                   "beyond"],
  ["catch",                    "catch"],
  ["teaser",                   "teaser"],

  // ── DIACRITIC-ONLY VOWEL PAIRS ──
  // Pairs like "ye", "ei", "eu", "uu" are only valid with diacritics
  // (e.g. "yê" normalizes to "ye" → valid, plain "ye" → rejected)
  ["yes",                       "yes"],
  ["meu",                       "meu"],
  ["bei",                       "bei"],
  ["user",                      "user"],
  ["suer",                      "suer"],

  // ⚠️ Tests below pass skipWords in the real extension (vntelex-transform.ts).
  ["yes, ok",                   "yes, ok"],
  ["yes,",                      "yes,"],
  ["status.",                   "status."],

  // ── Additional edge cases ──

  // Vowel-initial with tone
  ["af",                        "à"],
  ["is",                        "í"],
  ["ys",                        "ý"],

  // Valid final consonants
  ["boc",                       "boc"],
  ["bocs",                      "bóc"],
  ["banhf",                     "bành"],

  // Invalid final consonants → rejected
  ["bantt",                     "bantt"],
  ["bamsh",                     "bamsh"],

  // ⚠️ "bost" → "bót": valid VN syllable (bot = "pen" in VN). Same class as "mix" → "mĩ".
  ["bost",                      "bót"],

  // Valid diacritic-only pairs (has diacritic → passes)
  ["meeis",                     "mếi"],
  ["huuwf",                     "hùư"],
  ["yeeuf",                     "yều"],

  // ⚠️ English words that coincidentally form valid Vietnamese syllables
  // (same class as "mix" → "mĩ"). Handled by skipWords in the real extension.
  ["texts",                     "tét"],
  ["cores",                     "cóe"],
  ["test",                      "tét"],

  // 'qu' initial (u filtered from vowel list for tone placement)
  ["quaf",                      "quà"],
  ["quanf",                     "quàn"],

  // Mixed case transforms
  ["Nhas",                      "Nhá"],
  ["Toas",                      "Tóa"],

  // Punctuation attached to words
  ["hello,",                    "hello,"],
  ["cais,",                     "cái,"],
  ["(cais)",                    "(cái)"],
  ["\"baan\"",                  "\"bân\""],
  ["tanf,",                     "tàn,"],
  ["banf.",                     "bàn."],
  ["nhas!",                     "nhá!"],

  // Multi-word with English words mixed in
  ["cais hello",                "cái hello"],
  ["hello cais",                "hello cái"],
  ["test cais test",            "tét cái tét"],

  // ── LONG sentences ──
  [
    "Buoori sasng sowsm treen vufng quee thaajt thanh bifnh. Khoong khis trong lafnh khieesn taam hoofn con nguwowfi trowr neen thuw thasi. Nhuwxng giojt suwowng cofn ddojng laji treen las tre, laasp lasnh duwowsi asnh nawsng mawjt trowfi vuwfa hes rajng. Phisa xa, con dduwowfng nhor daaxn vafo nhaf oong Giang vawsng lawjng. Hafng duwfa nghieeng bosng been dofng keenh xanh ngawst. Chus chos nhor nawfm ngur ngon lafnh duwowsi gaafm ghees goox ddawjt ngoafi hieen. Mej tooi bawst ddaafu nhosm beesp ddeer naasu cowm. Khosi beesp bay leen hofa vafo lafn gios nhej, mang theo mufi thowm cura gajo mowsi. Đasm trer vui ver keso nhau ra saan xem maasy quar khees chisn vafng ddang luf luf treen cafnh. Treen mawjt hoof, vafi con vijt ddang bowi looji, tieesng quasc quasc lafm xao ddoojng khoong gian yeen tixnh. Sosng nuwowsc lawn tawn voox vafo reex caay been bowf. Nguwowfi daan bawst ddaafu ra ddoofng lafm vieejc vowsi tinh thaafn phaasn chaasn. Taast car tajo neen moojt buwsc tranh ddoofng quee ddejp ddex. Ver ddejp aasy khoong chir nawfm owr carnh vaajt maf cofn owr suwj chaan thafnh cura con nguwowfi nowi ddaay. Ai ai cuxng carm thaasy yeeu theem marnh ddaast mifnh ddang soosng. Phisa sau nhaf, khu vuwowfn cura baf ddaafy raaxy nhuwxng loaji caay awn quar. Nhuwxng chufm nhaxn chisn mojng treo lurng lawrng treen cafnh cao, trong khi nhuwxng quar phaajt thur cos hifnh dasng kyf laj laji nawfm khesp mifnh duwowsi tasn las. Saau trong gosc vuwowfn, maasy khosm sar vaf hafnh las ddang tora mufi huwowng noofng nafn sau cown muwa ddeem. Kyr nieejm veef nhuwxng ngafy hef ruwjc nawsng cuws thees hieejn veef. Lusc ddos, chusng tooi thuwowfng chajy ra ngox, ddowji tieesng cofi kisnh cura basc basn kem dajo. Ghees ddas duwowsi goosc dda ddaafu lafng laf nowi lys tuwowrng ddeer car nhosm ngoofi nghir chaan vaf thuwowrng thuwsc mosn quaf mast lajnh aasy giuwxa tieest trowfi oi ar. Vafo nhuwxng buoori chieefu taf, vaafng trawng khuyeest bawst ddaafu hieejn rox treen neefn trowfi xanh thawrm. Nguwowfi giaf trong lafng thuwowfng ngoofi nhaam nhi chesn traf nosng, keer laji nhuwxng caau chuyeejn xuwa cux veef thowfi khai hoang mowr coxi. Giojng nosi traafm aasm aasy nhuw sowji daay gawsn keest quas khuws vowsi hieejn taji. Nhijp soosng cuws thees trooi qua moojt casch chaajm raxi nhuwng ddaafy ys nghixa. Duf ddi ddaau xa, lofng nguwowfi vaaxn luoon huwowsng veef marnh ddaast giafu tifnh nguwowfi nafy. Ver ddejp giarn ddown tuwf chieesc nosn las, casi thusng, casi mejt laji chisnh laf nhuwxng ddieefu gaay thuwowng nhows nhaast cho nhuwxng nguwowfi con xa xuws. Anh mawst cura nhuwxng nguwowfi noong daan laasp lasnh nieefm vui khi nhifn thaasy casnh ddoofng lusa ddang chuyeern sang mafu vafng osng. Hoj vuwxng tin vafo moojt mufa mafng booji thu, nowi coong suwsc lao ddoojng dduwowjc ddeefn ddasp xuwsng ddasng. Em nhor tung tawng cawsp sasch towsi truwowfng, vang leen tieesng cuwowfi ddufa trong trero khawsp casc nero dduwowfng lafng.",
    "Buổi sáng sớm trên vùng quê thật thanh bình. Không khí trong lành khiến tâm hồn con người trở nên thư thái. Những giọt sương còn đọng lại trên lá tre, lấp lánh dưới ánh nắng mặt trời vừa hé rạng. Phía xa, con đường nhỏ dẫn vào nhà ông Giang vắng lặng. Hàng dừa nghiêng bóng bên dòng kênh xanh ngắt. Chú chó nhỏ nằm ngủ ngon lành dưới gầm ghế gỗ đặt ngoài hiên. Mẹ tôi bắt đầu nhóm bếp để nấu cơm. Khói bếp bay lên hòa vào làn gió nhẹ, mang theo mùi thơm của gạo mới. Đám trẻ vui vẻ kéo nhau ra sân xem mấy quả khế chín vàng đang lù lù trên cành. Trên mặt hồ, vài con vịt đang bơi lội, tiếng quác quác làm xao động không gian yên tĩnh. Sóng nước lăn tăn vỗ vào rễ cây bên bờ. Người dân bắt đầu ra đồng làm việc với tinh thần phấn chấn. Tất cả tạo nên một bức tranh đồng quê đẹp đẽ. Vẻ đẹp ấy không chỉ nằm ở cảnh vật mà còn ở sự chân thành của con người nơi đây. Ai ai cũng cảm thấy yêu thêm mảnh đất mình đang sống. Phía sau nhà, khu vườn của bà đầy rẫy những loại cây ăn quả. Những chùm nhãn chín mọng treo lủng lẳng trên cành cao, trong khi những quả phật thủ có hình dáng kỳ lạ lại nằm khép mình dưới tán lá. Sâu trong góc vườn, mấy khóm sả và hành lá đang tỏa mùi hương nồng nàn sau cơn mưa đêm. Kỷ niệm về những ngày hè rực nắng cứ thế hiện về. Lúc đó, chúng tôi thường chạy ra ngõ, đợi tiếng còi kính của bác bán kem dạo. Ghế đá dưới gốc đa đầu làng là nơi lý tưởng để cả nhóm ngồi nghỉ chân và thưởng thức món quà mát lạnh ấy giữa tiết trời oi ả. Vào những buổi chiều tà, vầng trăng khuyết bắt đầu hiện rõ trên nền trời xanh thẳm. Người già trong làng thường ngồi nhâm nhi chén trà nóng, kể lại những câu chuyện xưa cũ về thời khai hoang mở cõi. Giọng nói trầm ấm ấy như sợi dây gắn kết quá khứ với hiện tại. Nhịp sống cứ thế trôi qua một cách chậm rãi nhưng đầy ý nghĩa. Dù đi đâu xa, lòng người vẫn luôn hướng về mảnh đất giàu tình người này. Vẻ đẹp giản đơn từ chiếc nón lá, cái thúng, cái mẹt lại chính là những điều gây thương nhớ nhất cho những người con xa xứ. Anh mắt của những người nông dân lấp lánh niềm vui khi nhìn thấy cánh đồng lúa đang chuyển sang màu vàng óng. Họ vững tin vào một mùa màng bội thu, nơi công sức lao động được đền đáp xứng đáng. Em nhỏ tung tăng cắp sách tới trường, vang lên tiếng cười đùa trong trẻo khắp các nẻo đường làng."
  ],
];

describe("telexTransform", () => {
  for (const [input, expected] of testCases) {
    it(`${input} → ${expected}`, () => {
      assert.strictEqual(telexTransform(input), expected);
    });
  }
});

describe("telexTransform with skipWords", () => {
  it("exact match", () => {
    assert.strictEqual(telexTransform("mix", ["mix"]), "mix");
  });
  it("prefix match — 'core' skips 'cores'", () => {
    assert.strictEqual(telexTransform("cores", ["core"]), "cores");
  });
  it("prefix match — multiple tokens", () => {
    assert.strictEqual(telexTransform("core cores cored", ["core"]), "core cores cored");
  });
  it("cais still transforms even with unrelated skip word", () => {
    assert.strictEqual(telexTransform("cais", ["core"]), "cái");
  });
  it("prefix match with punctuation — 'core.'", () => {
    assert.strictEqual(telexTransform("core.", ["core"]), "core.");
  });
});
