import { ActionPanel, Action, List } from "@raycast/api";
import { useState } from "react";

// Define list of fonts to transform text
const fonts = [
    "upside-down",
    "gothic",
    "cursive",
    "double-bar",
    "square-text",
    "bubble-text",
    "small-caps",
    "bold",
    "strike-through"
];

export default function Command() {
    const [searchText, setSearchText] = useState("");

    return (
        <List
            onSearchTextChange={setSearchText}
            searchBarPlaceholder="Type your text to change..."
            throttle
        >
            <List.Section title="Custom UTF-8 Fonts" subtitle={"Press enter to copy to clipboard"}>
                {fonts.map((font, index) => (
                    <CustomFontItem key={index} inputText={searchText} fontType={font} />
                ))}
            </List.Section>
        </List>
    );
}

function CustomFontItem({ inputText, fontType }: { inputText: string, fontType: string }) {
    return (
        <List.Item
            title={fontToCustomFont(inputText, fontType)}
            subtitle={fontType}
            actions={
                <ActionPanel>
                    <ActionPanel.Section>
                        <Action.CopyToClipboard title="Copy Font Name" content={`${fontToCustomFont(inputText, fontType)}`} shortcut={{ modifiers: ["cmd"], key: "." }} />
                    </ActionPanel.Section>
                </ActionPanel>
            }
        />
    );
}

function fontToCustomFont(input: string, fontType: string) {
    switch (fontType) {
        case "upside-down":
            return fontMap(input, upsideDownMap).split("").reverse().join("");
        case "gothic":
            return fontMap(input, gothicMap);
        case "cursive":
            return fontMap(input, cursiveMap);
        case "square-text":
            return fontMap(input, squareTextMap);
        case "bubble-text":
            return fontMap(input, bubbleTextMap);
        case "double-bar":
            return fontMap(input, doubleBarMap);
        case "small-caps":
            return fontMap(input, smallCapsMap);
        case "bold":
            return fontMap(input, boldMap);
        case "strike-through":
            return strikeThroughMap(input);
        default:
            return input;
    }
}

function fontMap(input: string, map: Record<string, string>) {
    return input.split("").map((char) => {
        if (map[char]) {
            return map[char];
        } else {
            return char;
        }
    }).join("");
}

function strikeThroughMap(input: string) {
    return input.split("").map((char) => {
        if (char === " ") {
            return " ";
        } else {
            return char + "\u0336";
        }
    }).join("");
}

// Create direct mapping form single letters to custom fonts
// Cannot use index based mapping adue to utf characters sizes 

const squareTextMap = { "A": "🄰", "B": "🄱", "C": "🄲", "D": "🄳", "E": "🄴", "F": "🄵", "G": "🄶", "H": "🄷", "I": "🄸", "J": "🄹", "K": "🄺", "L": "🄻", "M": "🄼", "N": "🄽", "O": "🄾", "P": "🄿", "Q": "🅀", "R": "🅁", "S": "🅂", "T": "🅃", "U": "🅄", "V": "🅅", "W": "🅆", "X": "🅇", "Y": "🅈", "Z": "🅉", "a": "🅰", "b": "🅱", "c": "🅲", "d": "🅳", "e": "🅴", "f": "🅵", "g": "🅶", "h": "🅷", "i": "🅸", "j": "🅹", "k": "🅺", "l": "🅻", "m": "🅼", "n": "🅽", "o": "🅾", "p": "🅿", "q": "🆀", "r": "🆁", "s": "🆂", "t": "🆃", "u": "🆄", "v": "🆅", "w": "🆆", "x": "🆇", "y": "🆈", "z": "🆉", "0": "0", "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9" }

const bubbleTextMap = { "A": "🅐", "B": "🅑", "C": "🅒", "D": "🅓", "E": "🅔", "F": "🅕", "G": "🅖", "H": "🅗", "I": "🅘", "J": "🅙", "K": "🅚", "L": "🅛", "M": "🅜", "N": "🅝", "O": "🅞", "P": "🅟", "Q": "🅠", "R": "🅡", "S": "🅢", "T": "🅣", "U": "🅤", "V": "🅥", "W": "🅦", "X": "🅧", "Y": "🅨", "Z": "🅩", "a": "🅐", "b": "🅑", "c": "🅒", "d": "🅓", "e": "🅔", "f": "🅕", "g": "🅖", "h": "🅗", "i": "🅘", "j": "🅙", "k": "🅚", "l": "🅛", "m": "🅜", "n": "🅝", "o": "🅞", "p": "🅟", "q": "🅠", "r": "🅡", "s": "🅢", "t": "🅣", "u": "🅤", "v": "🅥", "w": "🅦", "x": "🅧", "y": "🅨", "z": "🅩", "0": "0", "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9" }

const smallCapsMap = { "A": "ᴀ", "B": "ʙ", "C": "ᴄ", "D": "ᴅ", "E": "ᴇ", "F": "ғ", "G": "ɢ", "H": "ʜ", "I": "ɪ", "J": "ᴊ", "K": "ᴋ", "L": "ʟ", "M": "ᴍ", "N": "ɴ", "O": "ᴏ", "P": "ᴘ", "Q": "ǫ", "R": "ʀ", "S": "s", "T": "ᴛ", "U": "ᴜ", "V": "ᴠ", "W": "ᴡ", "X": "x", "Y": "ʏ", "Z": "ᴢ", "a": "ᴀ", "b": "ʙ", "c": "ᴄ", "d": "ᴅ", "e": "ᴇ", "f": "ғ", "g": "ɢ", "h": "ʜ", "i": "ɪ", "j": "ᴊ", "k": "ᴋ", "l": "ʟ", "m": "ᴍ", "n": "ɴ", "o": "ᴏ", "p": "ᴘ", "q": "ǫ", "r": "ʀ", "s": "s", "t": "ᴛ", "u": "ᴜ", "v": "ᴠ", "w": "ᴡ", "x": "x", "y": "ʏ", "z": "ᴢ", "0": "0", "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9" }

const boldMap = { "A": "𝗔", "B": "𝗕", "C": "𝗖", "D": "𝗗", "E": "𝗘", "F": "𝗙", "G": "𝗚", "H": "𝗛", "I": "𝗜", "J": "𝗝", "K": "𝗞", "L": "𝗟", "M": "𝗠", "N": "𝗡", "O": "𝗢", "P": "𝗣", "Q": "𝗤", "R": "𝗥", "S": "𝗦", "T": "𝗧", "U": "𝗨", "V": "𝗩", "W": "𝗪", "X": "𝗫", "Y": "𝗬", "Z": "𝗭", "a": "𝗮", "b": "𝗯", "c": "𝗰", "d": "𝗱", "e": "𝗲", "f": "𝗳", "g": "𝗴", "h": "𝗵", "i": "𝗶", "j": "𝗷", "k": "𝗸", "l": "𝗹", "m": "𝗺", "n": "𝗻", "o": "𝗼", "p": "𝗽", "q": "𝗾", "r": "𝗿", "s": "𝘀", "t": "𝘁", "u": "𝘂", "v": "𝘃", "w": "𝘄", "x": "𝘅", "y": "𝘆", "z": "𝘇", "0": "0", "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9" }

const cursiveMap = {
    "A": "𝒜",
    "B": "𝐵",
    "C": "𝒞",
    "D": "𝒟",
    "E": "𝐸",
    "F": "𝐹",
    "G": "𝒢",
    "H": "𝐻",
    "I": "𝐼",
    "J": "𝒥",
    "K": "𝒦",
    "L": "𝐿",
    "M": "𝑀",
    "N": "𝒩",
    "O": "𝒪",
    "P": "𝒫",
    "Q": "𝒬",
    "R": "𝑅",
    "S": "𝒮",
    "T": "𝒯",
    "U": "𝒰",
    "V": "𝒱",
    "W": "𝒲",
    "X": "𝒳",
    "Y": "𝒴",
    "Z": "𝒵",
    "a": "𝒶",
    "b": "𝒷",
    "c": "𝒸",
    "d": "𝒹",
    "e": "𝑒",
    "f": "𝒻",
    "g": "𝑔",
    "h": "𝒽",
    "i": "𝒾",
    "j": "𝒿",
    "k": "𝓀",
    "l": "𝓁",
    "m": "𝓂",
    "n": "𝓃",
    "o": "𝑜",
    "p": "𝓅",
    "q": "𝓆",
    "r": "𝓇",
    "s": "𝓈",
    "t": "𝓉",
    "u": "𝓊",
    "v": "𝓋",
    "w": "𝓌",
    "x": "𝓍",
    "y": "𝓎",
    "z": "𝓏",
    "0": "𝟢",
    "1": "𝟣",
    "2": "𝟤",
    "3": "𝟥",
    "4": "𝟦",
    "5": "𝟧",
    "6": "𝟨",
    "7": "𝟩",
    "8": "𝟪",
    "9": "𝟫",
}

// Double bar map 
// 𝔸𝔹C𝔻𝔼𝔽𝔾H𝕀𝕁𝕂𝕃𝕄N𝕆PQR𝕊𝕋𝕌𝕍𝕎𝕏𝕐Z𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡
const doubleBarMap = {
    "A": "𝔸",
    "B": "𝔹",
    "C": "C",
    "D": "𝔻",
    "E": "𝔼",
    "F": "𝔽",
    "G": "𝔾",
    "H": "H",
    "I": "𝕀",
    "J": "𝕁",
    "K": "𝕂",
    "L": "𝕃",
    "M": "𝕄",
    "N": "N",
    "O": "O",
    "P": "P",
    "Q": "Q",
    "R": "R",
    "S": "𝕊",
    "T": "𝕋",
    "U": "𝕌",
    "V": "𝕍",
    "W": "𝕎",
    "X": "𝕏",
    "Y": "𝕐",
    "Z": "Z",
    "a": "𝕒",
    "b": "𝕓",
    "c": "c",
    "d": "𝕕",
    "e": "𝕖",
    "f": "𝕗",
    "g": "𝕘",
    "h": "𝕙",
    "i": "𝕚",
    "j": "𝕛",
    "k": "𝕜",
    "l": "𝕝",
    "m": "𝕞",
    "n": "𝕟",
    "o": "o",
    "p": "p",
    "q": "q",
    "r": "r",
    "s": "𝕤",
    "t": "𝕥",
    "u": "𝕦",
    "v": "𝕧",
    "w": "𝕨",
    "x": "𝕩",
    "y": "𝕪",
    "z": "𝕫",
    "0": "𝟘",
    "1": "𝟙",
    "2": "𝟚",
    "3": "𝟛",
    "4": "𝟜",
    "5": "𝟝",
    "6": "𝟞",
    "7": "𝟟",
    "8": "𝟠",
    "9": "𝟡",
}

const upsideDownMap = {
    "A": "∀",
    "B": "q",
    "C": "Ɔ",
    "D": "p",
    "E": "Ǝ",
    "F": "Ⅎ",
    "G": "פ",
    "H": "H",
    "I": "I",
    "J": "ſ",
    "K": "ʞ",
    "L": "˥",
    "M": "W",
    "N": "N",
    "O": "O",
    "P": "Ԁ",
    "Q": "Q",
    "R": "ɹ",
    "S": "S",
    "T": "┴",
    "U": "∩",
    "V": "Λ",
    "W": "M",
    "X": "X",
    "Y": "⅄",
    "Z": "Z",
    "a": "ɐ",
    "b": "q",
    "c": "ɔ",
    "d": "p",
    "e": "ǝ",
    "f": "ɟ",
    "g": "ƃ",
    "h": "ɥ",
    "i": "ᴉ",
    "j": "ɾ",
    "k": "ʞ",
    "l": "l",
    "m": "ɯ",
    "n": "u",
    "o": "o",
    "p": "d",
    "q": "b",
    "r": "ɹ",
    "s": "s",
    "t": "ʇ",
    "u": "n",
    "v": "ʌ",
    "w": "ʍ",
    "x": "x",
    "y": "ʎ",
    "z": "z",
    "0": "0",
    "1": "Ɩ",
    "2": "ᄅ",
    "3": "Ɛ",
    "4": "ㄣ",
    "5": "ϛ",
    "6": "9",
    "7": "ㄥ",
    "8": "8",
    "9": "6",
}

const gothicMap = {
    "A": "𝔄",
    "B": "𝔅",
    "C": "ℭ",
    "D": "𝔇",
    "E": "𝔈",
    "F": "𝔉",
    "G": "𝔊",
    "H": "ℌ",
    "I": "ℑ",
    "J": "𝔍",
    "K": "𝔎",
    "L": "𝔏",
    "M": "𝔐",
    "N": "𝔑",
    "O": "𝔒",
    "P": "𝔓",
    "Q": "𝔔",
    "R": "ℜ",
    "S": "𝔖",
    "T": "𝔗",
    "U": "𝔘",
    "V": "𝔙",
    "W": "𝔚",
    "X": "𝔛",
    "Y": "𝔜",
    "Z": "ℨ",
    "a": "𝔞",
    "b": "𝔟",
    "c": "𝔠",
    "d": "𝔡",
    "e": "𝔢",
    "f": "𝔣",
    "g": "𝔤",
    "h": "𝔥",
    "i": "𝔦",
    "j": "𝔧",
    "k": "𝔨",
    "l": "𝔩",
    "m": "𝔪",
    "n": "𝔫",
    "o": "𝔬",
    "p": "𝔭",
    "q": "𝔮",
    "r": "𝔯",
    "s": "𝔰",
    "t": "𝔱",
    "u": "𝔲",
    "v": "𝔳",
    "w": "𝔴",
    "x": "𝔵",
    "y": "𝔶",
    "z": "𝔷",
}
