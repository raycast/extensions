export function spongeCase(input, locale) {
    let result = "";
    for (const char of input) {
        result +=
            Math.random() > 0.5
                ? char.toLocaleUpperCase(locale)
                : char.toLocaleLowerCase(locale);
    }
    return result;
}
//# sourceMappingURL=index.js.map