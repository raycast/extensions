// Finickizer glue for Finicky 4. Imported by ~/.finickizer.js, which "Patch Finicky Config" in Raycast generates:
//
//   import config from "<your own Finicky config>";
//   import finickizer from "<this file>";
//   export default finickizer(config, { mode: "always", rules: [ … ] });
//
// It returns your config with two additions. The remembered rules are appended after your own
// handlers. And web URLs that no handler routes are rewritten into a Raycast deep link that opens
// the Finickizer chooser: for every such link in mode "always", only while fn is held in mode "fn"
// (otherwise the link goes to your defaultBrowser as usual).

const COMMAND = "raycast://extensions/trollfred/finickizer/choose";

// Mirrors Finicky's handler matching for arrays, functions (finicky.matchHostnames included) and regexes.
// Plain strings are compared to the full URL: Finicky's wildcard strings are not mirrored, so prefer
// finicky.matchHostnames or a regex in your own handlers.
const matches = (matcher, url, options) => {
  if (Array.isArray(matcher)) return matcher.some((m) => matches(m, url, options));
  if (typeof matcher === "function") return Boolean(matcher(url, options));
  if (matcher instanceof RegExp) return matcher.test(url.href);
  return matcher === url.href;
};

const deeplink = (url) => `${COMMAND}?arguments=${encodeURIComponent(JSON.stringify({ url: url.href }))}`;

export default function finickizer(config, { mode = "always", rules = [] } = {}) {
  const wanted = mode === "fn" ? () => finicky.getModifierKeys().fn : () => true;
  // The raycast: handler goes first so the deep link can never be captured by a loose handler of yours.
  const handlers = [
    { match: (url) => url.protocol === "raycast:", browser: "Raycast" },
    ...(config.handlers || []),
    ...rules,
  ];
  const unhandled = (url, options) => !handlers.some((handler) => matches(handler.match, url, options));
  const rewrite = [
    ...(config.rewrite || []),
    {
      match: (url, options) => /^https?:$/.test(url.protocol) && wanted() && unhandled(url, options),
      url: deeplink,
    },
  ];
  return { ...config, handlers, rewrite };
}
