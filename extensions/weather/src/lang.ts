import { getPreferenceValues } from "@raycast/api";
import { supportedLanguages } from "./wttr";


const words: Record<string, Record<string, string>> = {
    "humidity": {
        "de": "Feuchtigkeit",
        "fr": "humidité"
    },
    "wind": {
        "fr": "vent",
        "de": "Wind"
    },
    "weather report": {
        "de": "Wetterbericht für",
        "fr": "Prévisions météo pour"
    },
    "daily forecast": {
        "de": "Täglicher Wetterbericht",
        "fr": "prévisions quotidiennes"
    }
}

export function getTs(word: string) {
    let result = word;
    const lword = word.toLocaleLowerCase();
    if (Object.keys(words).includes(lword)) {
        const lang = getLanguage();
        if (lang) {
            const langs = words[lword];
            if (Object.keys(langs).includes(lang)) {
                result = langs[lang];
            }
        }
    }
    return result;
}

function getSystemLanguage(): string | undefined {
    const env = process.env;
    const lang = env.LANG || env.LANGUAGE || env.LC_ALL || env.LC_MESSAGES;
    if (lang) {
        if (lang.length > 2 && lang[2] === "_") {
            const syslang = lang.slice(0, 2).toLocaleLowerCase();
            if (supportedLanguages.includes(syslang)) {
                return syslang;
            }
        }
    }
    return undefined;
}

export function getLanguage(): string | undefined {
    const pref = getPreferenceValues();
    let lang = (pref.language as string) || undefined;
    if (lang === "system") {
        const syslang = getSystemLanguage();
        if (syslang && syslang.length > 0) {
            lang = syslang;
        }
    } else if (lang === "none") {
        lang = undefined;
    }
    return lang;
}