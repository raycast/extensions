import { logoManifest } from "./logo-manifest";

type Manifest = typeof logoManifest;

export type KnownLogoId = keyof Manifest;

export type LogoVariant = "auto" | "color" | "mono" | "light" | "dark";

export type LogoTheme = "light" | "dark";

export type LogoAssets = {
  color?: string;
  light?: string;
  dark?: string;
};

export type ResolvedLogo = {
  id?: KnownLogoId;
  label: string;
  src?: string;
  variant: "color" | "light" | "dark";
  assets: LogoAssets;
};

export type ResolveLogoOptions = {
  variant?: LogoVariant;
  theme?: LogoTheme;
  fallbackToColor?: boolean;
};

const manifestEntries = Object.entries(logoManifest) as Array<
  [KnownLogoId, LogoAssets]
>;

const normalisedKeyMap = new Map<string, KnownLogoId>();
const normalisedAliasMap = new Map<string, KnownLogoId>();

const pathToKeyMap = new Map<string, KnownLogoId>();

const labelOverrides: Partial<Record<KnownLogoId, string>> = {
  ai21: "AI21",
  "alibaba-cloud": "Alibaba Cloud",
  aws: "AWS",
  claudecode: "Claude Code",
  digitalocean: "DigitalOcean",
  "google-gemma": "Gemma",
  ibm: "IBM",
  lg: "LG",
  llmgateway: "LLM Gateway",
  "naver-hyperclova": "NAVER HyperCLOVA",
  "nex-agi": "Nex AGI",
  n8n: "n8n",
  opencode: "OpenCode",
  openwebui: "Open WebUI",
  stepfun: "StepFun",
  "spacex-ai": "SpaceXAI",
  zai: "Z.ai",
};

for (const [key, assets] of manifestEntries) {
  normalisedKeyMap.set(normalise(key), key);
  for (const value of Object.values(assets)) {
    if (!value) continue;
    pathToKeyMap.set(value, key);
  }
}

// Provider/catalog IDs are not always identical to logo IDs.
// Keep common aliases here so callers can pass provider IDs directly.
normalisedAliasMap.set(normalise("novitaai"), "novita");
normalisedAliasMap.set(normalise("cogito-ai"), "cogito");
normalisedAliasMap.set(normalise("anthropic-aws"), "aws");
normalisedAliasMap.set(normalise("anthropic-aws-us"), "aws");
normalisedAliasMap.set(normalise("x-ai"), "spacex-ai");
normalisedAliasMap.set(normalise("xai"), "spacex-ai");
normalisedAliasMap.set(normalise("longcat"), "meituan");
normalisedAliasMap.set(normalise("meituan-longcat"), "meituan");

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function lookupKnownId(input: string): KnownLogoId | undefined {
  if (!input) return undefined;
  if ((logoManifest as Record<string, LogoAssets>)[input]) {
    return input as KnownLogoId;
  }
  const normalised = normalise(input);
  if (!normalised) return undefined;
  return normalisedKeyMap.get(normalised) ?? normalisedAliasMap.get(normalised);
}

function labelFromId(id?: KnownLogoId | string): string {
  if (!id) return "Logo";
  if (labelOverrides[id as KnownLogoId])
    return labelOverrides[id as KnownLogoId]!;
  const words = id
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return words.join(" ");
}

function pickVariant(
  assets: LogoAssets,
  requestedVariant: LogoVariant,
  theme: LogoTheme,
  fallbackToColor: boolean,
): { src?: string; variant: "color" | "light" | "dark" } {
  const { color, light, dark } = assets;
  const applyFallbackVariant = (
    requested: "color" | "light" | "dark",
    source?: string,
    fallback?: "color" | "light" | "dark",
  ) => {
    if (!source) return { src: undefined, variant: requested };
    return {
      src: source,
      variant: fallback ?? requested,
    };
  };

  switch (requestedVariant) {
    case "color": {
      if (color) return { src: color, variant: "color" };
      if (fallbackToColor) {
        const fallback = theme === "dark" ? (dark ?? light) : (light ?? dark);
        return applyFallbackVariant(
          theme,
          fallback ?? color,
          color ? "color" : theme,
        );
      }
      break;
    }
    case "light": {
      const fallbackVariant = light ? "light" : color ? "color" : "dark";
      const src = light ?? color ?? dark;
      return { src, variant: fallbackVariant };
    }
    case "dark": {
      const fallbackVariant = dark ? "dark" : color ? "color" : "light";
      const src = dark ?? color ?? light;
      return { src, variant: fallbackVariant };
    }
    case "mono": {
      if (theme === "dark") {
        const src = dark ?? (fallbackToColor ? (color ?? light) : undefined);
        const variant =
          dark && src === dark
            ? "dark"
            : color && src === color
              ? "color"
              : "light";
        return { src, variant };
      }
      // theme === light
      {
        const src = light ?? (fallbackToColor ? (color ?? dark) : undefined);
        const variant =
          light && src === light
            ? "light"
            : color && src === color
              ? "color"
              : "dark";
        return { src, variant };
      }
    }
    case "auto":
    default: {
      if (color) return { src: color, variant: "color" };
      const fallbackVariant = theme === "dark" ? "dark" : "light";
      const src =
        theme === "dark"
          ? (dark ?? (fallbackToColor ? (color ?? light) : undefined))
          : (light ?? (fallbackToColor ? (color ?? dark) : undefined));
      if (src === color) return { src, variant: "color" };
      return { src, variant: fallbackVariant };
    }
  }

  // If we reach here, fall back sensibly
  if (color) return { src: color, variant: "color" };
  const src = theme === "dark" ? (dark ?? light) : (light ?? dark);
  return { src, variant: theme };
}

export function resolveLogo(
  input: string,
  options: ResolveLogoOptions = {},
): ResolvedLogo {
  const { variant = "auto", theme = "light", fallbackToColor = true } = options;

  let key = lookupKnownId(input);
  let assets: LogoAssets = key ? logoManifest[key] : {};

  if (!key && input.startsWith("/")) {
    key = pathToKeyMap.get(input);
    if (key) {
      assets = logoManifest[key];
    } else if (input.endsWith(".svg")) {
      // treat arbitrary static path as color-only asset
      assets = { color: input };
    }
  }

  if (!key && !assets.color && !assets.light && !assets.dark) {
    // final fallback: assume the caller passed a bare id that matches the filename exactly
    const assumedPath = `/logos/${input}.svg`;
    if (pathToKeyMap.has(assumedPath)) {
      key = pathToKeyMap.get(assumedPath);
      assets = logoManifest[key!];
    }
  }

  const { src, variant: resolvedVariant } = pickVariant(
    assets,
    variant,
    theme,
    fallbackToColor,
  );

  return {
    id: key,
    label: key ? labelFromId(key) : labelFromId(input),
    src,
    variant: resolvedVariant,
    assets,
  };
}

export function listKnownLogos(): Array<{
  id: KnownLogoId;
  label: string;
  assets: LogoAssets;
}> {
  return manifestEntries.map(([id, assets]) => ({
    id,
    label: labelFromId(id),
    assets,
  }));
}

export function getLogoLabel(id: string): string {
  const key = lookupKnownId(id);
  return labelFromId(key ?? id);
}

export function getKnownLogoIds(): KnownLogoId[] {
  return manifestEntries.map(([id]) => id);
}

export { logoManifest } from "./logo-manifest";
