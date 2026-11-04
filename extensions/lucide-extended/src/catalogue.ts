// The icon catalogue, read from lucide-extended-static on jsDelivr. A new npm
// release reaches the extension without a Store update.
const PACKAGE_URL = "https://cdn.jsdelivr.net/npm/lucide-extended-static";

export const CATALOGUE_URL = `${PACKAGE_URL}@latest/icons.json`;

export type Variant = "filled" | "duotone";

/** An entry in icons.json. */
export type CatalogueIcon = {
  name: string;
  tags: string[];
  categories: string[];
  aliases: string[];
  useCases: string[];
  variants: Variant[];
  components: Partial<Record<Variant, string>>;
  deprecated?: string;
};

export type Catalogue = { version: string; icons: CatalogueIcon[] };

/** One icon in one style: what the grid shows. */
export type IconItem = {
  slug: string;
  name: string;
  variant: Variant;
  component: string;
  url: string;
  aliases: string[];
  keywords: string[];
  useCases: string[];
  deprecated?: string;
};

/** jsDelivr names the version `@latest` resolved to, so every SVG URL can be pinned to it. */
export async function parseCatalogue(response: Response): Promise<Catalogue> {
  if (!response.ok) throw new Error(`Could not load the icons (HTTP ${response.status})`);
  const { icons } = (await response.json()) as { icons: CatalogueIcon[] };
  return { version: response.headers.get("x-jsd-version") ?? "latest", icons };
}

export function toItems({ version, icons }: Catalogue): IconItem[] {
  return icons.flatMap((icon) =>
    (["filled", "duotone"] as const)
      .filter((variant) => icon.variants.includes(variant))
      .map((variant) => {
        const slug = `${icon.name}-${variant}`;
        return {
          slug,
          name: icon.name,
          variant,
          component: icon.components[variant] as string,
          url: `${PACKAGE_URL}@${version}/icons/${slug}.svg`,
          aliases: icon.aliases.map((alias) => alias.toLowerCase()),
          keywords: [...icon.tags, ...icon.categories].map((keyword) => keyword.toLowerCase()),
          useCases: icon.useCases.map((useCase) => useCase.toLowerCase()),
          deprecated: icon.deprecated,
        };
      }),
  );
}
