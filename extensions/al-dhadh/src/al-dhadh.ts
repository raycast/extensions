import { Clipboard, showHUD, getSelectedText, showToast, Toast } from "@raycast/api";

// خريطة تحويل من العربية للإنجليزية بناءً على ترتيب الكيبورد
const arabicToEnglishMap: { [key: string]: string } = {
  // الصف الأول
  ض: "q",
  ص: "w",
  ث: "e",
  ق: "r",
  ف: "t",
  غ: "y",
  ع: "u",
  ه: "i",
  خ: "o",
  ح: "p",
  ج: "[",
  د: "]",
  // الصف الثاني
  ش: "a",
  س: "s",
  ي: "d",
  ب: "f",
  ل: "g",
  ا: "h",
  ت: "j",
  ن: "k",
  م: "l",
  ك: ";",
  ط: "'",
  // الصف الثالث
  ئ: "z",
  ء: "x",
  ؤ: "c",
  ر: "v",
  لا: "b",
  ى: "n",
  ة: "m",
  و: ",",
  ز: ".",
  ظ: "/",
  // أرقام وعلامات
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "٠": "0",
};

// خريطة تحويل من الإنجليزية للعربية
const englishToArabicMap: { [key: string]: string } = {
  // الصف الأول
  q: "ض",
  w: "ص",
  e: "ث",
  r: "ق",
  t: "ف",
  y: "غ",
  u: "ع",
  i: "ه",
  o: "خ",
  p: "ح",
  "[": "ج",
  "]": "د",
  Q: "ض",
  W: "ص",
  E: "ث",
  R: "ق",
  T: "ف",
  Y: "غ",
  U: "ع",
  I: "ه",
  O: "خ",
  P: "ح",
  // الصف الثاني
  a: "ش",
  s: "س",
  d: "ي",
  f: "ب",
  g: "ل",
  h: "ا",
  j: "ت",
  k: "ن",
  l: "م",
  ";": "ك",
  "'": "ط",
  A: "ش",
  S: "س",
  D: "ي",
  F: "ب",
  G: "ل",
  H: "ا",
  J: "ت",
  K: "ن",
  L: "م",
  // الصف الثالث
  z: "ئ",
  x: "ء",
  c: "ؤ",
  v: "ر",
  b: "لا",
  n: "ى",
  m: "ة",
  ",": "و",
  ".": "ز",
  "/": "ظ",
  Z: "ئ",
  X: "ء",
  C: "ؤ",
  V: "ر",
  B: "لا",
  N: "ى",
  M: "ة",
  // أرقام
  "1": "١",
  "2": "٢",
  "3": "٣",
  "4": "٤",
  "5": "٥",
  "6": "٦",
  "7": "٧",
  "8": "٨",
  "9": "٩",
  "0": "٠",
};

// دالة للتحقق من نوع النص (عربي أم إنجليزي)
function detectLanguage(text: string): "arabic" | "english" | "mixed" {
  const arabicChars = text.match(/[\u0600-\u06FF]/g);
  const englishChars = text.match(/[a-zA-Z]/g);

  if (arabicChars && !englishChars) return "arabic";
  if (englishChars && !arabicChars) return "english";
  return "mixed";
}

// دالة تحويل النص
function convertText(text: string): string {
  const language = detectLanguage(text);
  let converted = "";

  for (const char of text) {
    if (language === "arabic" || language === "mixed") {
      // تحويل من العربية للإنجليزية
      converted += arabicToEnglishMap[char] || char;
    } else {
      // تحويل من الإنجليزية للعربية
      converted += englishToArabicMap[char] || char;
    }
  }

  return converted;
}

export default async function main() {
  try {
    // محاولة الحصول على النص المحدد
    let selectedText: string;
    try {
      selectedText = await getSelectedText();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "لا يوجد نص للتحويل",
        message: "يرجى تحديد نص أو نسخ نص إلى الحافظة",
      });
      return;
    }

    if (!selectedText.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "لا يوجد نص للتحويل",
        message: "يرجى تحديد نص أو نسخ نص إلى الحافظة",
      });
      return;
    }

    // تحويل النص
    const convertedText = convertText(selectedText);

    // نسخ النص المحول إلى الحافظة
    // await Clipboard.copy(convertedText);
    await Clipboard.paste(convertedText);

    // عرض رسالة نجاح
    const originalLang = detectLanguage(selectedText);
    const targetLang = originalLang === "arabic" ? "الإنجليزية" : "العربية";

    await showHUD(`تم التحويل إلى ${targetLang} ونسخه للحافظة`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "خطأ في التحويل",
      message: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    });
  }
}
