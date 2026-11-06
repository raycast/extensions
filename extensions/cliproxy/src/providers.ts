/** Names, bundled logos and chart colors share one provider identity across every view. */
const PROVIDERS: Record<string, { title: string; logo: string; color: string; monochrome?: boolean }> = {
  claude: { title: "Claude", logo: "claude.svg", color: "#D9815B" },
  codex: { title: "Codex", logo: "openai.svg", color: "#5C94E8", monochrome: true },
  antigravity: { title: "Antigravity", logo: "antigravity.svg", color: "#4CA67A" },
  meta: { title: "Meta", logo: "meta.svg", color: "#438CF5" },
  xai: { title: "xAI", logo: "xai.svg", color: "#A49AEF", monochrome: true },
  kimi: { title: "Kimi", logo: "kimi.svg", color: "#6DBF96", monochrome: true },
  "kimi-ai": { title: "Kimi AI", logo: "kimi.svg", color: "#6DBF96", monochrome: true },
  devin: { title: "Devin", logo: "devin.svg", color: "#6EBCDE", monochrome: true },
};
export function providerInfo(provider: string) {
  return Object.hasOwn(PROVIDERS, provider)
    ? PROVIDERS[provider]
    : {
        title: provider.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        logo: null,
        color: "#9C98E5",
        monochrome: false,
      };
}
export function providerTitle(provider: string): string {
  return providerInfo(provider).title;
}
