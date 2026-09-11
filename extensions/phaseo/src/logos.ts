import { Image } from "@raycast/api";

import { resolveLogo } from "./logo-resolver";

function toAssetPath(source: string): string {
  return source.replace(/^\//, "");
}

export function getOrganisationLogo(
  organisationId: string | null,
): Image.ImageLike | undefined {
  if (!organisationId) return undefined;

  const light = resolveLogo(organisationId, { theme: "light" }).src;
  const dark = resolveLogo(organisationId, { theme: "dark" }).src;

  if (!light && !dark) return undefined;

  return {
    source: {
      light: toAssetPath(light ?? dark!),
      dark: toAssetPath(dark ?? light!),
    },
  };
}
