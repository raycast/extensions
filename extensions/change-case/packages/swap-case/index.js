export function swapCase(input, locale) {
    let result = "";
    for (const char of input) {
        const lower = char.toLocaleLowerCase(locale);
        result += char === lower ? char.toLocaleUpperCase(locale) : lower;
    }
    return result;
}
//# sourceMappingURL=index.js.map