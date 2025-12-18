import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { IconEntry, MaterialIconDefinition, MaterialIconMetadata, MaterialStyle } from "../types";
import iconManifest from "../assets/mui-icons.json";

const GOOGLE_MATERIAL_METADATA_URL = "https://fonts.google.com/metadata/icons";

// Cache built icon entries (paths are already calculated for all styles)
let cachedRawIcons: IconEntry[] | null = null;

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const toPascalCase = (value: string) => value.split(/[_-]/).filter(Boolean).map(capitalize).join("");

const buildKeywords = (icon: MaterialIconMetadata) => {
  const rawKeywords = [
    icon.name,
    icon.name.replace(/_/g, "-"),
    ...((icon.tags as string[]) ?? []),
    ...((icon.categories as string[]) ?? []),
    ...((icon.aliases as { name: string }[]) ?? []).map((alias) => alias.name),
  ];
  return Array.from(new Set(rawKeywords.filter(Boolean)));
};

const STYLE_TO_FONT_FAMILY: Record<MaterialStyle, string> = {
  filled: "materialicons",
  outlined: "materialiconsoutlined",
  rounded: "materialiconsround",
  sharp: "materialiconssharp",
  "two-tone": "materialiconstwotone",
};

const STYLE_TO_SUFFIX: Record<MaterialStyle, string> = {
  filled: "",
  outlined: "Outlined",
  rounded: "Rounded",
  sharp: "Sharp",
  "two-tone": "TwoTone",
};

const STYLE_ALIASES: Record<string, MaterialStyle> = {
  baseline: "filled",
  filled: "filled",
  outline: "outlined",
  outlined: "outlined",
  round: "rounded",
  rounded: "rounded",
  sharp: "sharp",
  "two-tone": "two-tone",
  twotone: "two-tone",
};

export const buildSvgUrl = (icon: Pick<MaterialIconMetadata, "name" | "version">, style: MaterialStyle) => {
  const family = STYLE_TO_FONT_FAMILY[style] ?? STYLE_TO_FONT_FAMILY.filled;
  const versionValue = icon.version ? String(icon.version) : "";
  const version = versionValue ? `${versionValue.startsWith("v") ? versionValue : `v${versionValue}`}/` : "";
  return `https://fonts.gstatic.com/s/i/${family}/${icon.name}/${version}24px.svg`;
};

const buildImportStatements = (pascalName: string, styles: MaterialStyle[]) =>
  styles.reduce<Partial<Record<MaterialStyle, string>>>((acc, style) => {
    const suffix = STYLE_TO_SUFFIX[style] ?? "";
    acc[style] = `import ${pascalName}${suffix}Icon from '@mui/icons-material/${pascalName}${suffix}';`;
    return acc;
  }, {});

const buildPaths = (icon: MaterialIconMetadata, styles: MaterialStyle[]) =>
  styles.reduce<Partial<Record<MaterialStyle, string>>>((acc, style) => {
    acc[style] = buildSvgUrl(icon, style);
    return acc;
  }, {});

const hasNumericPrefix = (name: string) => /^[0-9]/.test(name);

const normalizeStyles = (styles?: (MaterialStyle | string)[]): MaterialStyle[] => {
  // The Google Fonts API metadata doesn't include style information
  // But in practice, Material Icons support all styles for most icons
  // So we'll assume all icons support all styles
  if (!styles || styles.length === 0) {
    return ["filled", "outlined", "rounded", "sharp", "two-tone"];
  }

  const normalized = styles
    .map((style) => STYLE_ALIASES[String(style).toLowerCase()])
    .filter((style): style is MaterialStyle => Boolean(style));

  return normalized.length > 0
    ? Array.from(new Set(normalized))
    : ["filled", "outlined", "rounded", "sharp", "two-tone"];
};

const buildIconEntry = (icon: MaterialIconMetadata): IconEntry | undefined => {
  if (hasNumericPrefix(icon.name)) return undefined;

  const pascalName = toPascalCase(icon.name);
  const docsUrl = `https://mui.com/material-ui/material-icons/?query=${encodeURIComponent(pascalName)}`;
  const styles = normalizeStyles(icon.styles);

  return {
    name: pascalName,
    rawName: icon.name,
    version: icon.version,
    keywords: buildKeywords(icon),
    docsUrl,
    styles,
    importStatements: buildImportStatements(pascalName, styles),
    paths: buildPaths(icon, styles),
  };
};

const buildFallbackEntry = (icon: MaterialIconDefinition): IconEntry | undefined => {
  if (hasNumericPrefix(icon.name)) return undefined;

  const encodedSvg = encodeURIComponent(icon.svg);
  const dataUrl = `data:image/svg+xml;utf8,${encodedSvg}`;
  const docsUrl = `https://mui.com/material-ui/material-icons/?query=${encodeURIComponent(icon.name)}`;
  const styles = normalizeStyles(icon.styles);

  return {
    name: icon.name,
    rawName: icon.name,
    keywords: icon.keywords,
    docsUrl,
    styles,
    importStatements: buildImportStatements(icon.name, styles),
    paths: styles.reduce<Partial<Record<MaterialStyle, string>>>((acc, style) => {
      acc[style] = dataUrl;
      return acc;
    }, {}),
    svg: icon.svg,
  };
};

const loadRemoteIcons = async (): Promise<IconEntry[]> => {
  if (cachedRawIcons) {
    // Already have cached entries, return them
    return cachedRawIcons as IconEntry[];
  }

  // Fetch and build icons once
  const response = await fetch(GOOGLE_MATERIAL_METADATA_URL);
  const raw = await response.text();
  const sanitized = raw.replace(/^\)\]\}'/, "");
  const json = JSON.parse(sanitized) as { icons?: MaterialIconMetadata[] };

  const icons = (json.icons ?? []).map(buildIconEntry).filter((icon): icon is IconEntry => Boolean(icon));

  // Cache the built entries (paths are already calculated for all styles)
  cachedRawIcons = icons;
  return icons;
};

export function useFetchIcons() {
  const [data, setData] = useState<IconEntry[]>();
  const [isLoading, setIsLoading] = useState(true);

  // Fetch icons only once on mount - paths are already calculated for all styles
  useEffect(() => {
    let isMounted = true;
    let abortController: AbortController | undefined;
    setIsLoading(true);

    const hydrate = async () => {
      try {
        abortController = new AbortController();
        const icons = await loadRemoteIcons();
        if (!isMounted) return;
        setData(icons);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return; // Request was cancelled, ignore
        }
        console.error("Failed to fetch Material Icons metadata", error);
        if (!isMounted) return;
        await showToast({
          style: Toast.Style.Animated,
          title: "Using fallback icons",
          message: "Live Material Icons metadata is unavailable.",
        });
        if (!isMounted) return;
        setData(
          (iconManifest as MaterialIconDefinition[])
            .map(buildFallbackEntry)
            .filter((icon): icon is IconEntry => Boolean(icon)),
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
      abortController?.abort();
    };
  }, []); // Fetch only once - no need to re-fetch or re-map when style changes

  return { data, isLoading };
}
