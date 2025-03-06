import { ActionPanel, Action, Icon, List, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";

// アルファベットと数字の配列
const ALPHABET = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
];

// 特殊なマッピングが必要な文字
const SPECIAL_MAPPINGS: Record<string, Record<string, number>> = {
  // イタリック体の特殊なマッピング
  italic: {
    h: 0x210e, // プランク定数
  },
  // スクリプト体の特殊なマッピング
  script: {
    B: 0x212c, // スクリプト体のB
    E: 0x2130, // スクリプト体のE
    F: 0x2131, // スクリプト体のF
    H: 0x210b, // スクリプト体のH
    I: 0x2110, // スクリプト体のI
    L: 0x2112, // スクリプト体のL
    M: 0x2133, // スクリプト体のM
    R: 0x211b, // スクリプト体のR
  },
  // ダブルストラック体の特殊なマッピング
  doubleStruck: {
    C: 0x2102, // 複素数の集合
    H: 0x210d, // 四元数の集合
    N: 0x2115, // 自然数の集合
    P: 0x2119, // 素数の集合
    Q: 0x211a, // 有理数の集合
    R: 0x211d, // 実数の集合
    Z: 0x2124, // 整数の集合
  },
};

// 日本語変換用のマッピング
const HIRAGANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
const KATAKANA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
const HALF_KATAKANA = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ";

// スタイルの型定義
type UnicodeStyle = {
  name: string;
  code: number;
  digitCode: number | null;
  type: "unicode";
  specialMap?: string;
  icon: Icon;
};

type JapaneseStyle = {
  name: string;
  type: "japanese";
  conversionType: "hiragana" | "katakana" | "halfKatakana";
  icon: Icon;
};

type Style = UnicodeStyle | JapaneseStyle;

// スタイル名とUnicodeコードポイントのマッピング
const STYLES: Style[] = [
  { name: "Bold", code: 0x1d400, digitCode: 0x1d7ce, type: "unicode", icon: Icon.Bold },
  { name: "Italic", code: 0x1d434, digitCode: null, type: "unicode", specialMap: "italic", icon: Icon.Italics },
  { name: "Bold Italic", code: 0x1d468, digitCode: null, type: "unicode", icon: Icon.TextSelection },
  { name: "Script", code: 0x1d49c, digitCode: null, type: "unicode", specialMap: "script", icon: Icon.Pencil },
  { name: "Bold Script", code: 0x1d4d0, digitCode: null, type: "unicode", icon: Icon.Pencil },
  { name: "Fraktur", code: 0x1d504, digitCode: null, type: "unicode", icon: Icon.Text },
  { name: "Bold Fraktur", code: 0x1d56c, digitCode: null, type: "unicode", icon: Icon.Text },
  {
    name: "Double-struck",
    code: 0x1d538,
    digitCode: 0x1d7d8,
    type: "unicode",
    specialMap: "doubleStruck",
    icon: Icon.Racket,
  },
  { name: "Sans-serif", code: 0x1d5a0, digitCode: 0x1d7e2, type: "unicode", icon: Icon.Text },
  { name: "Sans-serif Bold", code: 0x1d5d4, digitCode: 0x1d7ec, type: "unicode", icon: Icon.Text },
  { name: "Sans-serif Italic", code: 0x1d608, digitCode: null, type: "unicode", icon: Icon.Text },
  { name: "Sans-serif Bold Italic", code: 0x1d63c, digitCode: null, type: "unicode", icon: Icon.Text },
  { name: "Monospace", code: 0x1d670, digitCode: 0x1d7f6, type: "unicode", icon: Icon.Code },
];

const convertToStyle = (text: string, style: Style) => {
  if (style.type === "japanese") {
    return convertJapanese(text, style.conversionType);
  }

  return text
    .split("")
    .map((char) => {
      // 特殊なマッピングがあるか確認
      if (style.specialMap && SPECIAL_MAPPINGS[style.specialMap] && SPECIAL_MAPPINGS[style.specialMap][char]) {
        return String.fromCodePoint(SPECIAL_MAPPINGS[style.specialMap][char]);
      }

      const index = ALPHABET.indexOf(char);
      if (index === -1) {
        return char;
      }

      // 数字の場合（インデックス52-61）
      if (index >= 52 && style.digitCode) {
        return String.fromCodePoint(style.digitCode + (index - 52));
      }

      // アルファベットの場合
      return String.fromCodePoint(style.code + index);
    })
    .join("");
};

// 日本語変換関数
const convertJapanese = (text: string, conversionType: "hiragana" | "katakana" | "halfKatakana") => {
  return text
    .split("")
    .map((char) => {
      // ひらがな→カタカナ
      if (conversionType === "katakana") {
        const index = HIRAGANA.indexOf(char);
        if (index !== -1) {
          return KATAKANA[index];
        }
      }
      // カタカナ→ひらがな
      else if (conversionType === "hiragana") {
        const index = KATAKANA.indexOf(char);
        if (index !== -1) {
          return HIRAGANA[index];
        }
      }
      // ひらがな/カタカナ→半角カナ
      else if (conversionType === "halfKatakana") {
        let index = HIRAGANA.indexOf(char);
        if (index !== -1) {
          return HALF_KATAKANA[index];
        }
        index = KATAKANA.indexOf(char);
        if (index !== -1) {
          return HALF_KATAKANA[index];
        }
      }
      return char;
    })
    .join("");
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClipboard = async () => {
      const text = await Clipboard.readText();
      setSearchText(text ?? "");
      setIsLoading(false);
    };
    fetchClipboard();
  }, []);

  return (
    <List isLoading={isLoading} filtering={false} searchText={searchText} onSearchTextChange={setSearchText}>
      {STYLES.map((style) => (
        <List.Item
          key={style.name}
          icon={style.icon}
          title={convertToStyle(searchText, style)}
          subtitle={style.name}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={convertToStyle(searchText, style)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
