const BASE_URL = "https://filledlucide.dev";

export type IconSet = "icons" | "lab";

export type FilledIcon = {
  name: string;
  set: IconSet;
  path: string;
  keywords: string[];
  categories: string[];
};

export type IconLibrary = {
  icons: FilledIcon[];
  categories: Record<string, string>;
};

type IndexEntry = {
  n: string;
  t: string[];
  c: string[];
  a: string[];
};

async function fetchJson<T>(file: string): Promise<T> {
  const response = await fetch(`${BASE_URL}/${file}`);
  if (!response.ok) {
    throw new Error(`Could not load ${file} (${response.status} ${response.statusText})`);
  }
  return (await response.json()) as T;
}

function toIcons(set: IconSet, index: IndexEntry[], paths: Record<string, string>): FilledIcon[] {
  return index
    .filter((entry) => paths[entry.n])
    .map((entry) => ({
      name: entry.n,
      set,
      path: paths[entry.n],
      keywords: [...entry.a, ...entry.t, ...entry.c],
      categories: entry.c,
    }));
}

export async function loadIconLibrary(): Promise<IconLibrary> {
  const [iconIndex, iconPaths, labIndex, labPaths, categories] = await Promise.all([
    fetchJson<IndexEntry[]>("icons-index.json"),
    fetchJson<Record<string, string>>("icons.json"),
    fetchJson<IndexEntry[]>("lab-index.json"),
    fetchJson<Record<string, string>>("lab.json"),
    fetchJson<Record<string, string>>("categories.json"),
  ]);

  return {
    icons: [...toIcons("icons", iconIndex, iconPaths), ...toIcons("lab", labIndex, labPaths)],
    categories,
  };
}

export function toSvg(icon: FilledIcon): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="${icon.path}"/></svg>`;
}

export function imageUrl(icon: FilledIcon): string {
  return `${BASE_URL}/${icon.set}/${icon.name}.svg`;
}

export function pageUrl(icon: FilledIcon): string {
  const params = new URLSearchParams({ icon: icon.name });
  if (icon.set === "lab") params.set("set", "lab");
  return `${BASE_URL}/?${params}`;
}

function toCamelCase(name: string): string {
  return name.replace(/-(\w)/g, (_, char: string) => char.toUpperCase());
}

function toPascalCase(name: string): string {
  const camel = toCamelCase(name);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

// Lab icons are icon nodes rendered through the framework's <Icon> component,
// the same way @lucide/lab works.
export function toComponent(icon: FilledIcon): string {
  return icon.set === "lab" ? `<Icon iconNode={${toCamelCase(icon.name)}} />` : `<${toPascalCase(icon.name)} />`;
}

export function toImport(icon: FilledIcon, framework: string): string {
  const frameworkPackage = `@filled-lucide/${framework}`;
  if (icon.set === "lab") {
    return `import { Icon } from "${frameworkPackage}";\nimport { ${toCamelCase(icon.name)} } from "@filled-lucide/lab";`;
  }
  return `import { ${toPascalCase(icon.name)} } from "${frameworkPackage}";`;
}

// Every word of the query has to appear in the name or a keyword. Name matches
// rank first: exact, then prefix, then anywhere in the name.
export function searchIcons(icons: FilledIcon[], query: string): FilledIcon[] {
  const text = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!text) return icons;
  const words = text.split(" ");
  const dashed = text.replace(/ /g, "-");

  const rank = (icon: FilledIcon) => {
    if (icon.name === dashed) return 0;
    if (icon.name.startsWith(dashed)) return 1;
    if (icon.name.includes(dashed)) return 2;
    return 3;
  };

  return icons
    .filter((icon) =>
      words.every((word) => icon.name.includes(word) || icon.keywords.some((keyword) => keyword.includes(word))),
    )
    .map((icon) => ({ icon, rank: rank(icon) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ icon }) => icon);
}
