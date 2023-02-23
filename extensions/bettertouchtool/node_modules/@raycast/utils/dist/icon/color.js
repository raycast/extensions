"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slightlyLighterColor = exports.slightlyDarkerColor = void 0;
function hexToRGB(hex) {
    let r = 0;
    let g = 0;
    let b = 0;
    // 3 digits
    if (hex.length === 4) {
        r = parseInt(`${hex[1]}${hex[1]}`, 16);
        g = parseInt(`${hex[2]}${hex[2]}`, 16);
        b = parseInt(`${hex[3]}${hex[3]}`, 16);
        // 6 digits
    }
    else if (hex.length === 7) {
        r = parseInt(`${hex[1]}${hex[2]}`, 16);
        g = parseInt(`${hex[3]}${hex[4]}`, 16);
        b = parseInt(`${hex[5]}${hex[6]}`, 16);
    }
    else {
        throw new Error(`Malformed hex color: ${hex}`);
    }
    return { r, g, b };
}
function rgbToHex({ r, g, b }) {
    let rString = r.toString(16);
    let gString = g.toString(16);
    let bString = b.toString(16);
    if (rString.length === 1) {
        rString = `0${rString}`;
    }
    if (gString.length === 1) {
        gString = `0${gString}`;
    }
    if (bString.length === 1) {
        bString = `0${bString}`;
    }
    return `#${rString}${gString}${bString}`;
}
function rgbToHSL({ r, g, b }) {
    // Make r, g, and b fractions of 1
    r /= 255;
    g /= 255;
    b /= 255;
    // Find greatest and smallest channel values
    const cmin = Math.min(r, g, b);
    const cmax = Math.max(r, g, b);
    const delta = cmax - cmin;
    let h = 0;
    let s = 0;
    let l = 0;
    // Calculate hue
    // No difference
    if (delta === 0) {
        h = 0;
    }
    // Red is max
    else if (cmax === r) {
        h = ((g - b) / delta) % 6;
    }
    // Green is max
    else if (cmax === g) {
        h = (b - r) / delta + 2;
    }
    // Blue is max
    else {
        h = (r - g) / delta + 4;
    }
    h = Math.round(h * 60);
    // Make negative hues positive behind 360°
    if (h < 0) {
        h += 360;
    }
    // Calculate lightness
    l = (cmax + cmin) / 2;
    // Calculate saturation
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    // Multiply l and s by 100
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);
    return { h, s, l };
}
function hslToRGB({ h, s, l }) {
    // Must be fractions of 1
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h >= 0 && h < 60) {
        r = c;
        g = x;
        b = 0;
    }
    else if (h >= 60 && h < 120) {
        r = x;
        g = c;
        b = 0;
    }
    else if (h >= 120 && h < 180) {
        r = 0;
        g = c;
        b = x;
    }
    else if (h >= 180 && h < 240) {
        r = 0;
        g = x;
        b = c;
    }
    else if (h >= 240 && h < 300) {
        r = x;
        g = 0;
        b = c;
    }
    else if (h >= 300 && h < 360) {
        r = c;
        g = 0;
        b = x;
    }
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    return { r, g, b };
}
function hexToHSL(hex) {
    return rgbToHSL(hexToRGB(hex));
}
function hslToHex(hsl) {
    return rgbToHex(hslToRGB(hsl));
}
function clamp(value, min, max) {
    return min < max ? (value < min ? min : value > max ? max : value) : value < max ? max : value > min ? min : value;
}
const offset = 12;
function slightlyDarkerColor(hex) {
    const hsl = hexToHSL(hex);
    return hslToHex({
        h: hsl.h,
        s: hsl.s,
        l: clamp(hsl.l - offset, 0, 100),
    });
}
exports.slightlyDarkerColor = slightlyDarkerColor;
function slightlyLighterColor(hex) {
    const hsl = hexToHSL(hex);
    return hslToHex({
        h: hsl.h,
        s: hsl.s,
        l: clamp(hsl.l + offset, 0, 100),
    });
}
exports.slightlyLighterColor = slightlyLighterColor;
