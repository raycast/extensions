"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvatarIcon = void 0;
const color_1 = require("./color");
function getWholeCharAndI(str, i) {
    const code = str.charCodeAt(i);
    if (Number.isNaN(code)) {
        return ["", i];
    }
    if (code < 0xd800 || code > 0xdfff) {
        return [str.charAt(i), i]; // Normal character, keeping 'i' the same
    }
    // High surrogate (could change last hex to 0xDB7F to treat high private
    // surrogates as single characters)
    if (0xd800 <= code && code <= 0xdbff) {
        if (str.length <= i + 1) {
            throw new Error("High surrogate without following low surrogate");
        }
        const next = str.charCodeAt(i + 1);
        if (0xdc00 > next || next > 0xdfff) {
            throw new Error("High surrogate without following low surrogate");
        }
        return [str.charAt(i) + str.charAt(i + 1), i + 1];
    }
    // Low surrogate (0xDC00 <= code && code <= 0xDFFF)
    if (i === 0) {
        throw new Error("Low surrogate without preceding high surrogate");
    }
    const prev = str.charCodeAt(i - 1);
    // (could change last hex to 0xDB7F to treat high private surrogates
    // as single characters)
    if (0xd800 > prev || prev > 0xdbff) {
        throw new Error("Low surrogate without preceding high surrogate");
    }
    // Return the next character instead (and increment)
    return [str.charAt(i + 1), i + 1];
}
const avatarColorSet = [
    "#DC829A",
    "#D64854",
    "#D47600",
    "#D36CDD",
    "#52A9E4",
    "#7871E8",
    "#70920F",
    "#43B93A",
    "#EB6B3E",
    "#26B795",
    "#D85A9B",
    "#A067DC",
    "#BD9500",
    "#5385D9", // Blue
];
/**
 * Icon to represent an avatar when you don't have one. The generated avatar
 * will be generated from the initials of the name and have a colorful but consistent background.
 *
 * @returns an Image that can be used where Raycast expects them.
 *
 * @example
 * ```
 * <List.Item icon={getAvatarIcon('Mathieu Dutour')} title="Project" />
 * ```
 */
function getAvatarIcon(name, options) {
    const words = name.trim().split(" ");
    let initials;
    if (words.length == 1 && getWholeCharAndI(words[0], 0)[0]) {
        initials = getWholeCharAndI(words[0], 0)[0];
    }
    else if (words.length > 1) {
        const firstWordFirstLetter = getWholeCharAndI(words[0], 0)[0] || "";
        const lastWordFirstLetter = getWholeCharAndI(words[words.length - 1], 0)[0] ?? "";
        initials = firstWordFirstLetter + lastWordFirstLetter;
    }
    else {
        initials = "";
    }
    let backgroundColor;
    if (options?.background) {
        backgroundColor = options?.background;
    }
    else {
        let initialsCharIndex = 0;
        let [char, i] = getWholeCharAndI(initials, 0);
        while (char) {
            initialsCharIndex += char.charCodeAt(0);
            [char, i] = getWholeCharAndI(initials, i + 1);
        }
        const colorIndex = initialsCharIndex % avatarColorSet.length;
        backgroundColor = avatarColorSet[colorIndex];
    }
    const padding = 0;
    const radius = 50 - padding;
    const svg = `<svg width="100px" height="100px">
  ${options?.gradient !== false
        ? `<defs>
      <linearGradient id="Gradient" x1="0.25" x2="0.75" y1="0" y2="1">
        <stop offset="0%" stop-color="${(0, color_1.slightlyLighterColor)(backgroundColor)}"/>
        <stop offset="50%" stop-color="${backgroundColor}"/>
        <stop offset="100%" stop-color="${(0, color_1.slightlyDarkerColor)(backgroundColor)}"/>
      </linearGradient>
  </defs>`
        : ""}
      <circle cx="50" cy="50" r="${radius}" fill="${options?.gradient !== false ? "url(#Gradient)" : backgroundColor}" />
      ${initials
        ? `<text x="50" y="80" font-size="${radius - 1}" font-family="Inter, sans-serif" text-anchor="middle" fill="white">${initials.toUpperCase()}</text>`
        : ""}
    </svg>
  `.replaceAll("\n", "");
    return `data:image/svg+xml,${svg}`;
}
exports.getAvatarIcon = getAvatarIcon;
