import {
  type SimpleIcon,
  siAndroid,
  siApple,
  siBun,
  siClaude,
  siCocoapods,
  siDocker,
  siGradle,
  siHomebrew,
  siNodedotjs,
  siNpm,
  siPnpm,
  siRust,
  siSwift,
  siUv,
  siXcode,
} from "simple-icons";

import type { ProviderId } from "../types";

export interface ThemedImageSource {
  light: string;
  dark: string;
}

// Codex has no entry because simple-icons removed the OpenAI mark; project artifacts have no single brand.
const PROVIDER_BRANDS: Partial<Record<ProviderId, SimpleIcon>> = {
  claude: siClaude,
  node: siNodedotjs,
  npm: siNpm,
  pnpm: siPnpm,
  bun: siBun,
  uv: siUv,
  rustup: siRust,
  cargo: siRust,
  gradle: siGradle,
  android: siAndroid,
  homebrew: siHomebrew,
  xcode: siXcode,
  simulator: siApple,
  cocoapods: siCocoapods,
  swiftpm: siSwift,
  docker: siDocker,
};

function relativeLuminance(hex: string): number {
  const [red, green, blue] = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function svgDataUri(icon: Pick<SimpleIcon, "path">, hex: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#${hex}" d="${icon.path}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function themedBrandSource(icon: Pick<SimpleIcon, "path" | "hex">): ThemedImageSource {
  const luminance = relativeLuminance(icon.hex);
  return {
    light: svgDataUri(icon, luminance > 0.85 ? "000000" : icon.hex),
    dark: svgDataUri(icon, luminance < 0.05 ? "FFFFFF" : icon.hex),
  };
}

const cache = new Map<ProviderId, ThemedImageSource | undefined>();

export function providerBrandSource(providerId: ProviderId): ThemedImageSource | undefined {
  if (!cache.has(providerId)) {
    const icon = PROVIDER_BRANDS[providerId];
    cache.set(providerId, icon ? themedBrandSource(icon) : undefined);
  }
  return cache.get(providerId);
}
