/** Strip `@media` / `@supports` blocks using brace depth (handles nested rules). */
function stripAtRuleBlocks(css: string, atRule: "@media" | "@supports"): string {
  let result = css;
  const needle = atRule;

  for (let start = result.indexOf(needle); start !== -1; start = result.indexOf(needle, start)) {
    const openBrace = result.indexOf("{", start);
    if (openBrace === -1) {
      break;
    }

    let depth = 1;
    let end = openBrace + 1;

    while (end < result.length && depth > 0) {
      const char = result[end];
      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
      }
      end += 1;
    }

    result = result.slice(0, start) + result.slice(end);
  }

  return result;
}

export function extractCSSVars(css: string) {
  const withoutMedia = stripAtRuleBlocks(css, "@media");
  const withoutSupports = stripAtRuleBlocks(withoutMedia, "@supports");
  const props = [...withoutSupports.matchAll(/--([\w-]+):([^;}]+)/g)].map(([, name, value]) => ({
    name: `--${name}`,
    value: value.trim(),
  }));
  return props;
}
