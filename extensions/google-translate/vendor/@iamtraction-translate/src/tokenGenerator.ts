/**
 * Source https://github.com/iamtraction/google-translate
 * MIT License
 */

import { request } from "undici";

function zr(a: string) {
    let b: any;
    if (null !== yr) b = yr;
    else {
        b = wr(String.fromCharCode(84));
        let c = wr(String.fromCharCode(75));
        b = [ b(), b() ];
        b[1] = c();
        b = (yr = window[b.join(c())] || "") || "";
    }
    let d: any = wr(String.fromCharCode(116));
    let c: any = wr(String.fromCharCode(107));
    d = [ d(), d() ];
    d[1] = c();
    c = "&" + d.join("") + "=";
    d = b.split(".");
    b = Number(d[0]) || 0;

    for (var e: any[] = [], f = 0, g = 0; g < a.length; g++) {
        let l = a.charCodeAt(g);
        128 > l ? e[f++] = l : (2048 > l ? e[f++] = l >> 6 | 192 : ((l & 64512) == 55296 && g + 1 < a.length && (a.charCodeAt(g + 1) & 64512) == 56320 ? (l = 65536 + ((l & 1023) << 10) + (a.charCodeAt(++g) & 1023), e[f++] = l >> 18 | 240, e[f++] = l >> 12 & 63 | 128) : e[f++] = l >> 12 | 224, e[f++] = l >> 6 & 63 | 128), e[f++] = l & 63 | 128);
    }
    let h: number = Number(b);
    for (let f = 0; f < e.length; f++) a += e[f], h = xr(h, "+-a^+6");
    h = xr(h, "+-3^+b+-f");
    h ^= Number(d[1]) || 0;
    0 > h && (h = (h & 2147483647) + 2147483648);
    h %= 1E6;
    return c + (a.toString() + "." + (h ^ b));
}

let yr: string | null = null;
let wr = function(a: string) {
    return function() {
        return a;
    };
};
let xr = function(a: number, b: string) {
    for (let c = 0; c < b.length - 2; c += 3) {
        let d = b.charAt(c + 2);
        let e = d >= "a" ? d.charCodeAt(0) - 87 : Number(d);
        e = b.charAt(c + 1) == "+" ? a >>> e : a << e;
        a = b.charAt(c) == "+" ? a + e & 4294967295 : a ^ e;
    }
    return a;
};

const config = new Map();

const window: any = {
    TKK: config.get("TKK") || "0"
};

async function updateTKK() {
    let now = Math.floor(Date.now() / 3600000);

    if (Number(window.TKK.split(".")[0]) !== now) {
        const response = await request("https://translate.google.com");
        const body = await response.body.text();

        // code will extract something like tkk:'1232135.131231321312', we need only value
        const code = body.match(/tkk:'\d+.\d+'/g);

        if (code && code.length > 0) {
            // extracting value tkk:'1232135.131231321312', this will extract only token: 1232135.131231321312
            const xt = code[0].split(":")[1].replace(/'/g, "");

            window.TKK = xt;
            config.set("TKK", xt);
        }
    }
}

export async function tokenGenerator(text: string) {
    try {
        await updateTKK();

        let tk = zr(text);
        tk = tk.replace("&tk=", "");
        return { name: "tk", value: tk };
    }
    catch (error) {
        return error;
    }
}
