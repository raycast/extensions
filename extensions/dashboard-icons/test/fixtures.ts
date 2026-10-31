// Payloads in the shape returned by https://dashboardicons.com/api/mcp (captured 2026-10-25).
const CDN = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons";

export const searchNtfy = {
  results: [{ name: "ntfy", title: "ntfy", source: "native", preview_url: `${CDN}/svg/ntfy.svg`, score: 3.6 }],
  total: 1,
};

export const searchGithub = {
  results: [
    { name: "github", title: "github", source: "native", preview_url: `${CDN}/svg/github.svg`, score: 3.6 },
    {
      name: "githubpages",
      title: "GitHub Pages",
      source: "simpleicons",
      preview_url: "https://cdn.simpleicons.org/githubpages/000000/FFFFFF",
      score: 3.2,
    },
    {
      name: "github",
      title: "github",
      source: "native",
      preview_url: `${CDN}/svg/github-light.svg`,
      score: 3.1,
      matched_variant: { key: "light", label: "Light", stem: "github-light" },
    },
    { title: "broken entry without name", source: "native" },
  ],
  total: 4,
};

function formats(name: string, variants: string[], list = ["svg", "png", "webp"]) {
  return Object.fromEntries(
    list.map((format) => [
      format,
      Object.fromEntries(
        variants.map((variant) => [
          variant,
          `${CDN}/${format}/${variant === "default" ? name : `${name}-${variant}`}.${format}`,
        ]),
      ),
    ]),
  );
}

export const iconNtfy = {
  found: true,
  icon: {
    name: "ntfy",
    title: "ntfy",
    source: "native",
    preview_url: `${CDN}/svg/ntfy.svg`,
    aliases: [],
    categories: [],
    author: "walkxcode",
    updated_at: "2024-03-21T00:53:48Z",
    brand_color: null,
    license: null,
    page_url: "https://dashboardicons.com/icons/ntfy",
    urls: formats("ntfy", ["default"]),
  },
};

export const iconPortabase = {
  found: true,
  icon: {
    name: "portabase",
    title: "portabase",
    source: "native",
    preview_url: `${CDN}/svg/portabase.svg`,
    aliases: [],
    categories: ["database", "network", "storage", "tools", "utility"],
    author: "Asuniia",
    updated_at: "2026-08-24T12:36:05.284Z",
    brand_color: null,
    license: null,
    page_url: "https://dashboardicons.com/icons/portabase",
    urls: formats("portabase", ["default", "light", "dark", "wordmark-light", "wordmark-dark"]),
  },
};

export const iconPngOnly = {
  found: true,
  icon: {
    name: "premium-mobile",
    title: "premium mobile",
    source: "native",
    preview_url: `${CDN}/png/premium-mobile.png`,
    aliases: ["mobile-network-operator", "telecom-company"],
    categories: ["Communication"],
    author: "walkxcode",
    updated_at: "2025-01-07T17:54:03Z",
    brand_color: null,
    license: null,
    page_url: "https://dashboardicons.com/icons/premium-mobile",
    urls: formats("premium-mobile", ["default"], ["png", "webp"]),
  },
};

export const iconSimpleIcons = {
  found: true,
  icon: {
    name: "githubpages",
    title: "GitHub Pages",
    source: "simpleicons",
    preview_url: "https://cdn.simpleicons.org/githubpages/000000/FFFFFF",
    aliases: [],
    categories: [],
    author: "Simple Icons",
    updated_at: "2026-10-11 10:21:38.000Z",
    brand_color: "#222222",
    license: {
      name: "CC0-1.0",
      url: null,
      attribution: "GitHub Pages icon via Simple Icons. Brand marks remain subject to their owners' terms.",
      source_url: "https://pages.github.com",
      guidelines_url: null,
      provider: "Simple Icons",
      provider_url: "https://simpleicons.org/",
    },
    page_url: "https://dashboardicons.com/icons/external/simpleicons/githubpages",
    urls: {
      svg: {
        default: "https://cdn.simpleicons.org/githubpages/222222",
        light: "https://cdn.simpleicons.org/githubpages/FFFFFF",
        dark: "https://cdn.simpleicons.org/githubpages/000000",
      },
      png: {
        default: "https://dashboardicons.com/api/icons/external/simpleicons/githubpages/brand.png",
        light: "https://dashboardicons.com/api/icons/external/simpleicons/githubpages/dark.png",
        dark: "https://dashboardicons.com/api/icons/external/simpleicons/githubpages/light.png",
      },
    },
  },
};

export const iconNotFound = {
  found: false,
  did_you_mean: [
    { name: "portabase", title: "portabase", source: "native", preview_url: `${CDN}/svg/portabase.svg`, score: 1.56 },
    {
      name: "portabase",
      title: "Portabase",
      source: "selfhst",
      preview_url: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/portabase.svg",
      score: 1.56,
    },
  ],
};

export const searchEmpty = { results: [], total: 0 };
