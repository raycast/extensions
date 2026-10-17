import { asciiCommaSeparated } from "../types/preferences";

// unicode

export const nativeToUnicode = (native: string) => {
  let unicode = "";
  for (let i = 0; i < native.length; i++) {
    const _u = native.charCodeAt(i).toString(16);
    const affixLength = 4 - _u.length;
    const affix = "0".repeat(affixLength);
    unicode += "\\u" + affix + _u;
  }
  return unicode;
};

export const unicodeToNative = (unicode: string) => {
  unicode = unicode.trim();
  let native = "";
  unicode.split("\\u").forEach((value) => {
    if (value == "") return;
    native += String.fromCharCode(parseInt(value, 16));
  });
  return native;
};

// base64

export const nativeToBase64 = (native: string) => {
  return Buffer.from(native, "utf-8").toString("base64");
};

export const base64ToNative = (base64: string) => {
  return Buffer.from(base64.trim(), "base64").toString("utf-8");
};

// utf-8

export const nativeToUtf8 = (native: string) => {
  return encodeURIComponent(native).replaceAll("%", "\\x");
};

export const utf8ToNative = (utf8: string) => {
  try {
    return decodeURIComponent(utf8.replaceAll("\\x", "%"));
  } catch (e) {
    return "";
  }
};

// ascii

export const nativeToAscii = (native: string) => {
  let ascii = "";
  for (const char of native) {
    if (asciiCommaSeparated && ascii != "") ascii += ",";
    ascii += char.charCodeAt(0).toString();
  }
  return ascii;
};

export const asciiToNative = (ascii: string) => {
  ascii = ascii.trim();
  if (asciiCommaSeparated) {
    return ascii
      .split(",")
      .map((charCodeStr) => {
        const charCode = parseInt(charCodeStr);
        if (isNaN(charCode)) return "";
        return String.fromCharCode(charCode);
      })
      .join("");
  } else {
    let acc = "";
    let native = "";
    for (const char of ascii) {
      acc += char;
      const accInt = parseInt(acc);
      if (!isNaN(accInt) && accInt > 13) {
        native += String.fromCharCode(accInt);
        acc = "";
      }
    }
    return native;
  }
};

// hex

export const nativeToHex = (native: string) => {
  if (native.length == 0) return "";
  let hex = "0x";
  for (const char of native) {
    const c = char.charCodeAt(0).toString(16).padStart(2, "0");
    hex += c.length > 2 ? `[${c}]` : c;
  }
  return hex;
};

export const hexToNative = (hex: string) => {
  hex = hex.trim();
  if (hex.startsWith("0x")) hex = hex.substring(2);
  const hexes = [];
  let accumulatedUnknownChar = 0;
  let isUnknownCharSequence = false;
  for (let i = 0; i < hex.length; i++) {
    const char = parseInt(hex[i], 16);
    if (isNaN(char)) {
      if (hex[i] == "[") isUnknownCharSequence = true;
      else if (hex[i] == "]") {
        isUnknownCharSequence = false;
        hexes.push(0);
        hexes.push(accumulatedUnknownChar);
        accumulatedUnknownChar = 0;
      }
      continue;
    }
    if (isUnknownCharSequence) {
      accumulatedUnknownChar = accumulatedUnknownChar * 16 + char;
    } else {
      // omit trailing zeros
      if (hexes.length == 0 && char == 0) continue;
      hexes.push(char);
    }
  }
  if (hexes.length % 2 == 1) hexes.unshift(0);
  let native = "";
  for (let i = 0; i < hexes.length; i += 2) {
    native += String.fromCharCode(hexes[i + 1] + 16 * hexes[i]);
  }
  return native;
};

// decimal

export const nativeToDecimal = (native: string) => {
  if (native.length == 0) return "";
  let dec = BigInt(0);
  for (const char of native) {
    const c = char.charCodeAt(0);
    if (c >= 256) return "";
    dec = dec * BigInt(256) + BigInt(c);
  }
  return dec.toString();
};

export const decimalToNative = (dec: string) => {
  try {
    let number = BigInt(dec.trim());
    let native = "";
    while (number > 0) {
      const c = number % BigInt(256);
      native = String.fromCharCode(Number(c)) + native;
      number = number / BigInt(256);
    }
    return native;
  } catch {
    return "";
  }
};

// url

export const urlToNative = (url: string) => {
  try {
    return decodeURIComponent(url);
  } catch (e) {
    return "";
  }
};

export const nativeToUrl = encodeURIComponent;

// entity

export const entityToNative = (utf8: string) => {
  utf8 = utf8.trim();
  if (utf8.length == 0) return "";
  return utf8
    .replaceAll(";", "")
    .split("&#x")
    .map((value) => (value.length == 0 ? "" : String.fromCharCode(parseInt(value, 16))))
    .join("");
};

export const nativeToEntity = (native: string) => {
  return native
    .split("")
    .map((char) => {
      const u = char.charCodeAt(0).toString(16);
      const affixLength = 4 - u.length;
      return "&#x" + "0".repeat(affixLength) + u + ";";
    })
    .join("");
};
