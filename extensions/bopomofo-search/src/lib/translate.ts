import { environment } from "@raycast/api";
import { readFileSync } from "fs";

const pinyinToBopomofoMap: Record<string, string> = JSON.parse(
    readFileSync(`${environment.assetsPath}/pinyin-translation.json`, "utf-8"),
);
const jqxSpecialCases = {
    un: "ㄩㄣ",
    uan: "ㄩㄢ",
};

export function translatePinyinToBopomofo(pinyin: string): string {
    // match the longest possible pinyin sequence in the input string
    let result = "";
    let remaining = pinyin.toLowerCase();

    while (remaining.length > 0) {
        let foundMatch = false;

        // Check for the longest match in the remaining string
        for (let i = remaining.length; i > 0; i--) {
            const segment = remaining.slice(0, i);
            if (pinyinToBopomofoMap[segment]) {
                const bopomofoChar = pinyinToBopomofoMap[segment];
                if (["ㄐ", "ㄑ", "ㄒ"].includes(result.slice(-1)) && (segment === "un" || segment === "uan")) {
                    // Special handling for "un" and "uan" after "ㄐ", "ㄑ", "ㄒ"
                    result += jqxSpecialCases[segment];
                } else {
                    result += bopomofoChar;
                }
                remaining = remaining.slice(i);
                foundMatch = true;
                break;
            }
        }

        // If no match is found, skip the first character to avoid infinite loop
        if (!foundMatch) {
            remaining = remaining.slice(1);
        }
    }

    return result;
}
