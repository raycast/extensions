export function formatInteger(value: number): string {
  return value.toLocaleString();
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatPosition(value: number | null): string {
  return value === null ? "-" : value.toFixed(1);
}

export function formatModelName(value: string): string {
  const model = value.split("/").at(-1) ?? value;
  const [family, ...parts] = model.split("-");
  const familyNames: Record<string, string> = {
    claude: "Claude",
    deepseek: "DeepSeek",
    gemini: "Gemini",
    glm: "GLM",
    gpt: "GPT",
    grok: "Grok",
    llama: "Llama",
    mistral: "Mistral",
    qwen: "Qwen",
  };
  const name = familyNames[family.toLowerCase()] ?? `${family.charAt(0).toUpperCase()}${family.slice(1)}`;
  const details = parts.map((part) => {
    if (part.toLowerCase() === "grounded") {
      return "+ Web Search";
    }
    if (/^[a-z]\d+$/i.test(part) || ["ai", "zdr"].includes(part.toLowerCase())) {
      return part.toUpperCase();
    }
    return `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
  });

  if (["GLM", "GPT"].includes(name) && /^\d/.test(details[0] ?? "")) {
    return `${name}-${details.join(" ")}`;
  }
  return [name, ...details].join(" ");
}

export function formatGeoDate(value: string | null): string {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function escapeMarkdown(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/([\\`*_[\]<>|])/g, "\\$1");
}

export function escapeMarkdownUrl(value: string): string {
  return encodeURI(value).replace(/\(/g, "%28").replace(/\)/g, "%29");
}
