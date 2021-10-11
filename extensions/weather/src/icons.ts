// codes from https://raw.githubusercontent.com/chubin/wttr.in/master/lib/constants.py

export function getIcon(weatherCode: string): string {
    const code = WWO_CODE[weatherCode] || "";
    const ico = WEATHER_SYMBOL[code] || WEATHER_SYMBOL["Unknown"];
    return ico;
}

export function getWindDirectionIcon(degree: string): string {
    const deg = parseFloat(degree);
    const windIndex = Math.round(((deg + 22.5) % 360) / 45.0);
    const wind_direction = WIND_DIRECTION[windIndex];
    return wind_direction;
}

export const WWO_CODE: { [key: string]: string; } = {
    "113": "Sunny",
    "116": "PartlyCloudy",
    "119": "Cloudy",
    "122": "VeryCloudy",
    "143": "Fog",
    "176": "LightShowers",
    "179": "LightSleetShowers",
    "182": "LightSleet",
    "185": "LightSleet",
    "200": "ThunderyShowers",
    "227": "LightSnow",
    "230": "HeavySnow",
    "248": "Fog",
    "260": "Fog",
    "263": "LightShowers",
    "266": "LightRain",
    "281": "LightSleet",
    "284": "LightSleet",
    "293": "LightRain",
    "296": "LightRain",
    "299": "HeavyShowers",
    "302": "HeavyRain",
    "305": "HeavyShowers",
    "308": "HeavyRain",
    "311": "LightSleet",
    "314": "LightSleet",
    "317": "LightSleet",
    "320": "LightSnow",
    "323": "LightSnowShowers",
    "326": "LightSnowShowers",
    "329": "HeavySnow",
    "332": "HeavySnow",
    "335": "HeavySnowShowers",
    "338": "HeavySnow",
    "350": "LightSleet",
    "353": "LightShowers",
    "356": "HeavyShowers",
    "359": "HeavyRain",
    "362": "LightSleetShowers",
    "365": "LightSleetShowers",
    "368": "LightSnowShowers",
    "371": "HeavySnowShowers",
    "374": "LightSleetShowers",
    "377": "LightSleet",
    "386": "ThunderyShowers",
    "389": "ThunderyHeavyRain",
    "392": "ThunderySnowShowers",
    "395": "HeavySnowShowers",
}

export const WEATHER_SYMBOL: { [key: string]: string; } = {
    Unknown: "✨",
    Cloudy: "☁️",
    Fog: "🌫",
    HeavyRain: "🌧",
    HeavyShowers: "🌧",
    HeavySnow: "❄️",
    HeavySnowShowers: "❄️",
    LightRain: "🌦",
    LightShowers: "🌦",
    LightSleet: "🌧",
    LightSleetShowers: "🌧",
    LightSnow: "🌨",
    LightSnowShowers: "🌨",
    PartlyCloudy: "⛅️",
    Sunny: "☀️",
    ThunderyHeavyRain: "🌩",
    ThunderyShowers: "⛈",
    ThunderySnowShowers: "⛈",
    VeryCloudy: "☁️",
};

/*const WEATHER_SYMBOL_WIDTH_VTE: Record<string, number> = {
    "✨": 2,
    "☁️": 1,
    "🌫": 2,
    "🌧": 2,
    "🌧": 2,
    "❄️": 1,
    "❄️": 1,
    "🌦": 1,
    "🌦": 1,
    "🌧": 1,
    "🌧": 1,
    "🌨": 2,
    "🌨": 2,
    "⛅️": 2,
    "☀️": 1,
    "🌩": 2,
    "⛈": 1,
    "⛈": 1,
    "☁️": 1,
};*/

export const WIND_DIRECTION = [
    "↓", "↙", "←", "↖", "↑", "↗", "→", "↘",
];

export const MOON_PHASES = [
    "🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"
];

export const LOCALE = {
    "af": "af_ZA", "ar": "ar_TN", "az": "az_AZ", "be": "be_BY", "bg": "bg_BG",
    "bs": "bs_BA", "ca": "ca_ES", "cs": "cs_CZ", "cy": "cy_GB", "da": "da_DK",
    "de": "de_DE", "el": "el_GR", "eo": "eo", "es": "es_ES", "et": "et_EE",
    "fa": "fa_IR", "fi": "fi_FI", "fr": "fr_FR", "fy": "fy_NL", "ga": "ga_IE",
    "he": "he_IL", "hr": "hr_HR", "hu": "hu_HU", "hy": "hy_AM", "ia": "ia",
    "id": "id_ID", "is": "is_IS", "it": "it_IT", "ja": "ja_JP", "jv": "en_US",
    "ka": "ka_GE", "ko": "ko_KR", "kk": "kk_KZ", "ky": "ky_KG", "lt": "lt_LT",
    "lv": "lv_LV", "mk": "mk_MK", "ml": "ml_IN", "nb": "nb_NO", "nl": "nl_NL",
    "nn": "nn_NO", "pt": "pt_PT", "pt-br": "pt_BR", "pl": "pl_PL", "ro": "ro_RO",
    "ru": "ru_RU", "sv": "sv_SE", "sk": "sk_SK", "sl": "sl_SI", "sr": "sr_RS",
    "sr-lat": "sr_RS@latin", "sw": "sw_KE", "th": "th_TH", "tr": "tr_TR", "uk": "uk_UA",
    "uz": "uz_UZ", "vi": "vi_VN", "zh": "zh_TW", "zu": "zu_ZA",
};