// prettier-ignore
export enum DocID {
  Antd, Antdv, Apollo, Arthas, Astro,
  Bootstrap, Clerk, Dubbo, Echarts,
  Flet, GitBook, Homebrew, IPFS,
  Laravel, Nuxt, NvChad, Pnpm,
  Prettier, RSSHub, Raycast, React,
  React_Bootstrap, React_Native,
  Remix, Slidev, Taro, Supabase,
  TailwindCSS, Tauri, Unidata, Vite,
  Vitest, Vue_Router, Vue, VueUse,
  Vuepress, ElementPlus, Neovim, Less,
  Sass, Deno, TypeScript, NextJS,
  MassTransit, Pinia,
}

type Base = {
  icon: string;
  apiKey: string;
  homepage: string;
  indexName: string;
  searchParameters?: object;
};

export type Algolia = Base & {
  appId: string;
  type: "algolia";
};

export type Meilisearch = Base & {
  apiHost: string;
  type: "meilisearch";
};

type DocsTypes = "Manual" | "Modules" | "App" | "Pages";
type Languages = "en-US" | "zh-CN" | "fr-FR" | "ko-KR" | "it-IT";
type Versions = "V0" | "V1" | "V2" | "V3" | "V4" | "V9";
export type Tags = `${Versions} ${Languages}` | `${Languages} ${DocsTypes}` | `${Languages}`;

export type API = Algolia | Meilisearch;
export type Data = {
  [key in DocID]: {
    [key in Tags]?: API;
  };
};

export const data: Data = {
  [DocID.Deno]: {
    "en-US Manual": {
      icon: "../assets/logo/deno.png",
      apiKey: "2ed789b2981acd210267b27f03ab47da",
      appId: "QFPCRZC6WX",
      indexName: "manual",
      type: "algolia",
      homepage: "https://deno.com/",
      searchParameters: {
        filters: "kind:paragraph",
      },
    },
    "en-US Modules": {
      icon: "../assets/logo/deno.png",
      apiKey: "2ed789b2981acd210267b27f03ab47da",
      appId: "QFPCRZC6WX",
      indexName: "modules",
      type: "algolia",
      homepage: "https://deno.land/x/",
    },
  },
  [DocID.Sass]: {
    "en-US": {
      icon: "../assets/logo/sass.png",
      apiKey: "2ebc7881b79986f58dc2f424769bf3fc",
      appId: "Q9MULQONSV",
      indexName: "sass-lang",
      type: "algolia",
      homepage: "https://sass-lang.com/",
    },
  },
  [DocID.Less]: {
    "en-US": {
      icon: "../assets/logo/less.png",
      apiKey: "ad081396555d043318b6a9af4f27a9ec",
      appId: "LELS6COOLE",
      indexName: "lesscss",
      type: "algolia",
      homepage: "https://lesscss.org/",
    },
  },
  [DocID.Neovim]: {
    "en-US": {
      icon: "../assets/logo/nvim.png",
      apiKey: "b5e6b2f9c636b2b471303205e59832ed",
      appId: "X185E15FPG",
      indexName: "nvim",
      type: "algolia",
      homepage: "https://neovim.io/",
    },
  },
  [DocID.ElementPlus]: {
    "en-US": {
      icon: "../assets/logo/element.png",
      apiKey: "99caf32e743ba77d78b095b763b8e380",
      appId: "ZM3TI8AKL4",
      indexName: "element-plus",
      type: "algolia",
      homepage: "https://element-plus.org/en-US/",
      searchParameters: {
        facetFilters: ["language:en-US"],
      },
    },
    "zh-CN": {
      icon: "../assets/logo/element.png",
      apiKey: "99caf32e743ba77d78b095b763b8e380",
      appId: "ZM3TI8AKL4",
      indexName: "element-plus",
      type: "algolia",
      homepage: "https://element-plus.org/zh-CN/",
      searchParameters: {
        facetFilters: ["language:zh-CN"],
      },
    },
  },
  [DocID.Antd]: {
    "en-US": {
      icon: "../assets/logo/antd.png",
      apiKey: "60ac2c1a7d26ab713757e4a081e133d0",
      appId: "BH4D9OD16A",
      indexName: "ant_design",
      type: "algolia",
      homepage: "https://ant.design/",
      searchParameters: {
        facetFilters: ["tags:en"],
      },
    },
    "zh-CN": {
      icon: "../assets/logo/antd.png",
      apiKey: "60ac2c1a7d26ab713757e4a081e133d0",
      appId: "BH4D9OD16A",
      indexName: "ant_design",
      type: "algolia",
      homepage: "https://ant.design/index-cn",
      searchParameters: {
        facetFilters: ["tags:cn"],
      },
    },
  },
  [DocID.Antdv]: {
    "en-US": {
      icon: "../assets/logo/antdv.png",
      apiKey: "92003c1d1d07beef165b08446f4224a3",
      appId: "BH4D9OD16A",
      indexName: "antdv",
      type: "algolia",
      homepage: "https://antdv.com/components/overview-cn",
      searchParameters: {
        facetFilters: ["tags:en"],
      },
    },
    "zh-CN": {
      icon: "../assets/logo/antdv.png",
      apiKey: "92003c1d1d07beef165b08446f4224a3",
      appId: "BH4D9OD16A",
      indexName: "antdv",
      type: "algolia",
      homepage: "https://antdv.com/components/overview",
      searchParameters: {
        facetFilters: ["tags:cn"],
      },
    },
  },
  [DocID.Apollo]: {
    "en-US": {
      icon: "../assets/logo/apollo.png",
      apiKey: "ef1ac4e3c439bc17a8e7572700691efc",
      appId: "Q0CJ63JM7B",
      indexName: "docs",
      type: "algolia",
      homepage: "https://www.apollographql.com/docs",
    },
  },
  [DocID.Arthas]: {
    "en-US": {
      icon: "../assets/logo/arthas.png",
      apiKey: "03fb4b6577b57b5dafc792d9ddf66508",
      appId: "UX8WBNVHHR",
      indexName: "arthas",
      type: "algolia",
      homepage: "https://arthas.aliyun.com/",
    },
  },
  [DocID.Astro]: {
    "en-US": {
      icon: "../assets/logo/astro.png",
      apiKey: "4440670147c44d744fd8da35ff652518",
      appId: "7AFBU8EPJU",
      indexName: "astro",
      type: "algolia",
      homepage: "https://docs.astro.build/",
      searchParameters: {
        facetFilters: ["lang:en"],
      },
    },
    "zh-CN": {
      icon: "../assets/logo/astro.png",
      apiKey: "4440670147c44d744fd8da35ff652518",
      appId: "7AFBU8EPJU",
      indexName: "astro",
      type: "algolia",
      homepage: "https://docs.astro.build/zh-cn/",
      searchParameters: {
        facetFilters: ["lang:zh-cn"],
      },
    },
  },
  [DocID.Bootstrap]: {
    "en-US": {
      icon: "../assets/logo/bootstrap.png",
      apiKey: "3151f502c7b9e9dafd5e6372b691a24e",
      appId: "AK7KMZKZHQ",
      indexName: "bootstrap",
      type: "algolia",
      homepage: "https://getbootstrap.com/",
      searchParameters: {
        attributesToRetrieve: [
          "hierarchy.lvl0",
          "hierarchy.lvl1",
          "hierarchy.lvl2",
          "hierarchy.lvl3",
          "hierarchy.lvl4",
          "hierarchy.lvl5",
          "hierarchy.lvl6",
          "content",
          "type",
          "url",
        ],
        facetFilters: ["version:5.3"],
      },
    },
  },
  [DocID.Clerk]: {
    "en-US": {
      icon: "../assets/logo/clerk.png",
      apiKey: "52385d30a5ca4460564defe5b2d0ffb1",
      appId: "RA7W9NZP4T",
      indexName: "prod_sanity",
      type: "algolia",
      homepage: "https://clerk.dev",
    },
  },
  [DocID.Dubbo]: {
    "zh-CN": {
      icon: "../assets/logo/dubbo.png",
      apiKey: "364ae307e1da9d02b2335675e9db1eb1",
      appId: "L5F4T9F0I1",
      indexName: "apache_dubbo",
      type: "algolia",
      homepage: "https://dubbo.apache.org/",
    },
  },
  [DocID.Echarts]: {
    "en-US": {
      icon: "../assets/logo/echarts.png",
      apiKey: "6ade5f1ff34e94690f9ea38cddcc2f55",
      appId: "BH4D9OD16A",
      indexName: "apache_echarts",
      type: "algolia",
      homepage: "https://echarts.apache.org/en/index.html",
      searchParameters: {
        facetFilters: ["lang:en"],
      },
    },
    "zh-CN": {
      icon: "../assets/logo/echarts.png",
      apiKey: "6ade5f1ff34e94690f9ea38cddcc2f55",
      appId: "BH4D9OD16A",
      indexName: "apache_echarts",
      type: "algolia",
      homepage: "https://echarts.apache.org/zh/index.html",
      searchParameters: {
        facetFilters: ["lang:zh"],
      },
    },
  },
  [DocID.Flet]: {
    "en-US": {
      icon: "../assets/logo/flet.png",
      apiKey: "4b060907ba79d92e8869e9d1ff80bce7",
      appId: "ESNSJEY7OD",
      indexName: "flet",
      type: "algolia",
      homepage: "https://flet.dev/",
    },
  },
  [DocID.GitBook]: {
    "en-US": {
      icon: "../assets/logo/gitbook.png",
      apiKey:
        "MDgxNzdmZGVhM2MzMDJiMjAxMzczZTllMmVmMDAxOGQ1N2YzMjAyM2M0ZWMxZjk5NmFmYjE0ODA0OWUzYzFlMGZpbHRlcnM9KHZpZXdhYmxlQnlQdWJsaWNTcGFjZXMlM0FOa0VHUzdoemVxYTM1c01YUVo0WC0xKSUyMEFORCUyMHByb2plY3RJZCUzQWdpdGJvb2steC1wcm9k",
      appId: "U102FN9U1K",
      indexName: "pages",
      type: "algolia",
      homepage: "https://docs.gitbook.com/",
    },
  },
  [DocID.Homebrew]: {
    "en-US": {
      icon: "../assets/logo/homebrew.png",
      apiKey: "a57ef92bf2adfae863a201ee43d6b5a1",
      appId: "BH4D9OD16A",
      indexName: "brew_all",
      type: "algolia",
      homepage: "https://brew.sh/",
    },
  },
  [DocID.IPFS]: {
    "en-US": {
      icon: "../assets/logo/ipfs.png",
      apiKey: "e56fc7c611806522df45191e22ed15ac",
      appId: "BH4D9OD16A",
      indexName: "ipfs-docs",
      type: "algolia",
      homepage: "https://docs.ipfs.tech/",
    },
  },
  [DocID.Laravel]: {
    "V9 en-US": {
      icon: "../assets/logo/laravel.png",
      apiKey: "1fa3a8fec06eb1858d6ca137211225c0",
      appId: "E3MIRNPJH5",
      indexName: "laravel",
      type: "algolia",
      homepage: "https://laravel.com/",
      searchParameters: {
        facetFilters: ["version:9.x"],
        highlightPreTag: '<em class: "not-italic bg-red-600 bg-opacity-25">',
        highlightPostTag: "</em>",
      },
    },
  },
  [DocID.Nuxt]: {
    "V3 en-US": {
      icon: "../assets/logo/nuxt.png",
      apiKey: "60a01900a4b726d667eab75b6f337592",
      appId: "1V8G7N9GF0",
      indexName: "nuxtjs",
      type: "algolia",
      homepage: "https://v3.nuxtjs.org/",
      searchParameters: {
        facetFilters: ["language:en-US", "tags:v3"],
      },
    },
    "V2 en-US": {
      icon: "../assets/logo/nuxt.png",
      apiKey: "60a01900a4b726d667eab75b6f337592",
      appId: "1V8G7N9GF0",
      indexName: "nuxtjs",
      type: "algolia",
      homepage: "https://nuxtjs.org/",
      searchParameters: {
        facetFilters: ["language:en-US", "tags:main"],
      },
    },
  },
  [DocID.NvChad]: {
    "en-US": {
      icon: "../assets/logo/nvchad.png",
      apiKey: "c74ee96af1dea95b6e189501983733f8",
      appId: "BOJS19CH35",
      indexName: "nvchad",
      type: "algolia",
      homepage: "https://nvchad.com/",
    },
  },
  [DocID.Pnpm]: {
    "en-US": {
      icon: "../assets/logo/pnpm.png",
      apiKey: "a337998a623aa8f80d2a97a79d565086",
      appId: "RAHRBBK2WL",
      indexName: "pnpm",
      type: "algolia",
      homepage: "https://pnpm.io/zh",
      searchParameters: {
        facetFilters: ["language:en"],
      },
    },
    "zh-CN": {
      icon: "../assets/logo/pnpm.png",
      apiKey: "a337998a623aa8f80d2a97a79d565086",
      appId: "RAHRBBK2WL",
      indexName: "pnpm",
      type: "algolia",
      homepage: "https://pnpm.io/zh",
      searchParameters: {
        facetFilters: ["language:zh"],
      },
    },
  },
  [DocID.Prettier]: {
    "en-US": {
      icon: "../assets/logo/prettier.png",
      apiKey: "9fcdb2a62af4c47cc5eecf3d5a747818",
      appId: "BH4D9OD16A",
      indexName: "prettier",
      type: "algolia",
      homepage: "https://prettier.io/",
    },
  },
  [DocID.RSSHub]: {
    "en-US": {
      icon: "../assets/logo/rsshub.png",
      apiKey: "375c36cd9573a2c1d1e536214158c37120fdd0ba6cd8829f7a848e940cc22245",
      indexName: "rsshub",
      type: "meilisearch",
      apiHost: "https://meilisearch.rsshub.app/",
      homepage: "https://docs.rsshub.app/",
    },
  },
  [DocID.Raycast]: {
    "en-US": {
      icon: "../assets/logo/raycast.png",
      apiKey:
        "YmZlNDIxZTVlYWQyOWQ4ZThhMzdkOGUxOTY0YjU2NGNjZDNkOTA5NjQ3MmZmMjg0MzViYjYzMDI4NTVkMmQ1ZmZpbHRlcnM9KHZpZXdhYmxlQnlQdWJsaWNTcGFjZXMlM0EtTWVfOEEzOXRGaFpnM1VhVm9TTi0yKSUyMEFORCUyMHByb2plY3RJZCUzQWdpdGJvb2steC1wcm9k",
      appId: "U102FN9U1K",
      indexName: "pages",
      type: "algolia",
      homepage: "https://developers.raycast.com/",
    },
  },
  [DocID.React]: {
    "en-US": {
      icon: "../assets/logo/react.png",
      apiKey: "36221914cce388c46d0420343e0bb32e",
      appId: "BH4D9OD16A",
      indexName: "react",
      type: "algolia",
      homepage: "https://reactjs.org/",
    },
    "zh-CN": {
      icon: "../assets/logo/react.png",
      apiKey: "72499aaa151dba0828babe727c7b86ee",
      appId: "BH4D9OD16A",
      indexName: "reactjs_zh-hans",
      type: "algolia",
      homepage: "https://zh-hans.reactjs.org/",
    },
  },
  [DocID.React_Bootstrap]: {
    "en-US": {
      icon: "../assets/logo/react_bootstrap.png",
      apiKey: "33985ee571397d832ef243988ff4c891",
      appId: "C38ZI55F9H",
      type: "algolia",
      homepage: "https://react-bootstrap.github.io/",
      indexName: "react_bootstrap_v4",
    },
  },
  [DocID.React_Native]: {
    "en-US": {
      icon: "../assets/logo/react.png",
      apiKey: "83cd239c72f9f8b0ed270a04b1185288",
      appId: "8TDSE0OHGQ",
      indexName: "react-native-v2",
      type: "algolia",
      homepage: "https://reactnative.dev/",
      searchParameters: {
        facetFilters: [
          "language:en",
          [
            "docusaurus_tag:default",
            "docusaurus_tag:docs-default-0.69",
            "docusaurus_tag:docs-contributing-current",
            "docusaurus_tag:docs-architecture-current",
          ],
        ],
      },
    },
  },
  [DocID.Remix]: {
    "en-US": {
      icon: "../assets/logo/remix.png",
      apiKey: "dff56670dbec8494409989d6ec9c8ac2",
      appId: "6OHWJSR8G4",
      type: "algolia",
      homepage: "https://remix.run/",
      indexName: "remix",
    },
  },
  [DocID.Slidev]: {
    "en-US": {
      icon: "../assets/logo/slidev.png",
      apiKey: "1ff173fe73b20edc962c1c24c0b1c160",
      appId: "LCBV6MIFS6",
      indexName: "slidev",
      type: "algolia",
      homepage: "https://sli.dev/",
      searchParameters: {
        facetFilters: ["language:en"],
      },
    },
    "zh-CN": {
      icon: "../assets/logo/slidev.png",
      apiKey: "1a5c5a504139c58f428974c78c55291d",
      appId: "BH4D9OD16A",
      indexName: "slidev",
      type: "algolia",
      homepage: "https://cn.sli.dev/",
      searchParameters: {
        facetFilters: ["language:cn"],
      },
    },
  },
  [DocID.Supabase]: {
    "en-US": {
      icon: "../assets/logo/supabase.png",
      apiKey: "0424becc4055d51ec60e54cc37df5574",
      appId: "B3Z5XYG8NS",
      indexName: "prod_docs",
      type: "algolia",
      homepage: "https://supabase.com/docs",
    },
  },
  [DocID.TailwindCSS]: {
    "V4 en-US": {
      icon: "../assets/logo/tailwindcss.png",
      apiKey: "5fc87cef58bb80203d2207578309fab6",
      appId: "KNPXZI5B0M",
      indexName: "tailwindcss",
      type: "algolia",
      homepage: "https://tailwindcss.com/",
      searchParameters: {
        facetFilters: [["version:v4", "version:plus"]],
        attributesToRetrieve: [
          "hierarchy.lvl0",
          "hierarchy.lvl1",
          "hierarchy.lvl2",
          "hierarchy.lvl3",
          "hierarchy.lvl4",
          "hierarchy.lvl5",
          "hierarchy.lvl6",
          "content",
          "type",
          "url",
          "product",
          "product_category",
        ],
        attributesToSnippet: [
          "hierarchy.lvl1:5",
          "hierarchy.lvl2:5",
          "hierarchy.lvl3:5",
          "hierarchy.lvl4:5",
          "hierarchy.lvl5:5",
          "hierarchy.lvl6:5",
          "content:5",
        ],
      },
    },
    "V3 en-US": {
      icon: "../assets/logo/tailwindcss.png",
      apiKey: "5fc87cef58bb80203d2207578309fab6",
      appId: "KNPXZI5B0M",
      indexName: "tailwindcss",
      type: "algolia",
      homepage: "https://v3.tailwindcss.com/",
      searchParameters: {
        facetFilters: ["version:v3"],
      },
    },
    "V2 en-US": {
      icon: "../assets/logo/tailwindcss.png",
      apiKey: "5fc87cef58bb80203d2207578309fab6",
      appId: "KNPXZI5B0M",
      indexName: "tailwindcss",
      type: "algolia",
      homepage: "https://v2.tailwindcss.com/",
      searchParameters: {
        facetFilters: ["version:v2"],
      },
    },
    "V1 en-US": {
      icon: "../assets/logo/tailwindcss.png",
      apiKey: "3df93446658cd9c4e314d4c02a052188",
      appId: "BH4D9OD16A",
      indexName: "tailwindcss",
      type: "algolia",
      homepage: "https://v1.tailwindcss.com/",
      searchParameters: {
        facetFilters: ["version:v1"],
      },
    },
    "V0 en-US": {
      icon: "../assets/logo/tailwindcss.png",
      apiKey: "3df93446658cd9c4e314d4c02a052188",
      appId: "BH4D9OD16A",
      indexName: "tailwindcss",
      type: "algolia",
      homepage: "https://tailwindcss-v0.netlify.app/",
      searchParameters: {
        facetFilters: ["version:v0"],
      },
    },
  },
  [DocID.Taro]: {
    "V4 zh-CN": {
      icon: "../assets/logo/taro.png",
      apiKey: "3f32982103f4e75dadd86900d26a9315",
      appId: "BH4D9OD16A",
      indexName: "taro-zone",
      type: "algolia",
      homepage: "https://docs.taro.zone/docs/4.x/",
      searchParameters: {
        facetFilters: ["language:zh-cn", ["docusaurus_tag:default", "docusaurus_tag:docs-default-4.x"]],
      },
    },
    "V3 zh-CN": {
      icon: "../assets/logo/taro.png",
      apiKey: "3f32982103f4e75dadd86900d26a9315",
      appId: "BH4D9OD16A",
      indexName: "taro-zone",
      type: "algolia",
      homepage: "https://docs.taro.zone/docs/",
      searchParameters: {
        facetFilters: ["language:zh-cn", ["docusaurus_tag:default", "docusaurus_tag:docs-default-3.x"]],
      },
    },
    "V2 zh-CN": {
      icon: "../assets/logo/taro.png",
      apiKey: "3f32982103f4e75dadd86900d26a9315",
      appId: "BH4D9OD16A",
      indexName: "taro-zone",
      type: "algolia",
      homepage: "https://docs.taro.zone/docs/2.x/",
      searchParameters: {
        facetFilters: ["language:zh-cn", ["docusaurus_tag:default", "docusaurus_tag:docs-default-2.x"]],
      },
    },
    "V1 zh-CN": {
      icon: "../assets/logo/taro.png",
      apiKey: "3f32982103f4e75dadd86900d26a9315",
      appId: "BH4D9OD16A",
      indexName: "taro-zone",
      type: "algolia",
      homepage: "https://docs.taro.zone/docs/1.x/",
      searchParameters: {
        facetFilters: ["language:zh-cn", ["docusaurus_tag:default", "docusaurus_tag:docs-default-1.x"]],
      },
    },
  },
  [DocID.Tauri]: {
    "en-US": {
      icon: "../assets/logo/tauri.png",
      apiKey: "3eb6db150af1abefe000f00386e149dfb5a006932cab55d1ccd810b8672a4e12",
      indexName: "docs-v1",
      type: "meilisearch",
      apiHost: "https://ms-4ebb96f179f0-1619.fra.meilisearch.io/",
      homepage: "https://tauri.app/",
      searchParameters: {
        attributesToHighlight: ["*"],
        attributesToCrop: ["content"],
        cropLength: 30,
        filter: ["lang = en"],
      },
    },
    "zh-CN": {
      icon: "../assets/logo/tauri.png",
      apiKey: "3eb6db150af1abefe000f00386e149dfb5a006932cab55d1ccd810b8672a4e12",
      indexName: "docs-v1",
      type: "meilisearch",
      apiHost: "https://ms-4ebb96f179f0-1619.fra.meilisearch.io/",
      homepage: "https://tauri.app/zh-cn/",
      searchParameters: {
        attributesToHighlight: ["*"],
        attributesToCrop: ["content"],
        cropLength: 30,
        filter: ["lang = zh-cn"],
      },
    },
    "fr-FR": {
      icon: "../assets/logo/tauri.png",
      apiKey: "3eb6db150af1abefe000f00386e149dfb5a006932cab55d1ccd810b8672a4e12",
      indexName: "docs-v1",
      type: "meilisearch",
      apiHost: "https://ms-4ebb96f179f0-1619.fra.meilisearch.io/",
      homepage: "https://tauri.app/fr/",
      searchParameters: {
        attributesToHighlight: ["*"],
        attributesToCrop: ["content"],
        cropLength: 30,
        filter: ["lang = fr"],
      },
    },
    "ko-KR": {
      icon: "../assets/logo/tauri.png",
      apiKey: "3eb6db150af1abefe000f00386e149dfb5a006932cab55d1ccd810b8672a4e12",
      indexName: "docs-v1",
      type: "meilisearch",
      apiHost: "https://ms-4ebb96f179f0-1619.fra.meilisearch.io/",
      homepage: "https://tauri.app/ko/",
      searchParameters: {
        attributesToHighlight: ["*"],
        attributesToCrop: ["content"],
        cropLength: 30,
        filter: ["lang = ko"],
      },
    },
    "it-IT": {
      icon: "../assets/logo/tauri.png",
      apiKey: "3eb6db150af1abefe000f00386e149dfb5a006932cab55d1ccd810b8672a4e12",
      indexName: "docs-v1",
      type: "meilisearch",
      apiHost: "https://ms-4ebb96f179f0-1619.fra.meilisearch.io/",
      homepage: "https://tauri.app/it/",
      searchParameters: {
        attributesToHighlight: ["*"],
        attributesToCrop: ["content"],
        cropLength: 30,
        filter: ["lang = it"],
      },
    },
  },
  [DocID.Unidata]: {
    "en-US": {
      icon: "../assets/logo/unidata.png",
      apiKey: "3f968df846740a9e2b38e89d8e6ce9fa",
      appId: "LNA1UZCPZB",
      indexName: "unidata",
      type: "algolia",
      homepage: "https://unidata.app/",
      searchParameters: {
        facetFilters: ["lang:en-US"],
      },
    },
  },
  [DocID.Vite]: {
    "en-US": {
      icon: "../assets/logo/vite.png",
      apiKey: "b573aa848fd57fb47d693b531297403c",
      appId: "BH4D9OD16A",
      indexName: "vitejs",
      type: "algolia",
      homepage: "https://vitejs.dev/",
    },
    "zh-CN": {
      icon: "../assets/logo/vite.png",
      apiKey: "b573aa848fd57fb47d693b531297403c",
      appId: "BH4D9OD16A",
      indexName: "vitejs",
      type: "algolia",
      homepage: "https://cn.vitejs.dev/",
      searchParameters: {
        facetFilters: ["tags:cn"],
      },
    },
  },
  [DocID.Vitest]: {
    "en-US": {
      icon: "../assets/logo/vitest.png",
      apiKey: "9c3ced6fed60d2670bb36ab7e8bed8bc",
      appId: "ZTF29HGJ69",
      indexName: "vitest",
      type: "algolia",
      homepage: "https://vitest.dev/",
    },
  },
  [DocID.Vue_Router]: {
    "V4 en-US": {
      icon: "../assets/logo/vue.png",
      apiKey: "771d10c8c5cc48f7922f15048b4d931c",
      appId: "BTNTW3I1XP",
      indexName: "next_router_vuejs",
      type: "algolia",
      homepage: "https://router.vuejs.org/",
      searchParameters: {
        facetFilters: ["lang:en-US"],
      },
    },
    "V4 zh-CN": {
      icon: "../assets/logo/vue.png",
      apiKey: "771d10c8c5cc48f7922f15048b4d931c",
      appId: "BTNTW3I1XP",
      indexName: "next_router_vuejs",
      type: "algolia",
      homepage: "https://router.vuejs.org/zh/",
      searchParameters: {
        facetFilters: ["lang:zh-CN"],
      },
    },
    "V3 en-US": {
      icon: "../assets/logo/vue.png",
      apiKey: "08e7ef7cd3969442874f0dee9dec34be",
      appId: "LI3RW4C4QI",
      indexName: "vue-router",
      type: "algolia",
      homepage: "https://v3.router.vuejs.org/",
      searchParameters: {
        facetFilters: ["lang:en-US"],
      },
    },
    "V3 zh-CN": {
      icon: "../assets/logo/vue.png",
      apiKey: "08e7ef7cd3969442874f0dee9dec34be",
      appId: "LI3RW4C4QI",
      indexName: "vue-router",
      type: "algolia",
      homepage: "https://v3.router.vuejs.org/zh/",
      searchParameters: {
        facetFilters: ["lang:zh-CN"],
      },
    },
  },
  [DocID.Vue]: {
    "V3 en-US": {
      icon: "../assets/logo/vue.png",
      apiKey: "f49cbd92a74532cc55cfbffa5e5a7d01",
      appId: "ML0LEBN7FQ",
      indexName: "vuejs",
      type: "algolia",
      homepage: "https://vuejs.org/",
      searchParameters: {
        facetFilters: ["version:v3"],
      },
    },
    "V3 zh-CN": {
      icon: "../assets/logo/vue.png",
      apiKey: "c23eb8e7895f42daeaf2bf6f63eb4bf6",
      appId: "UURH1MHAF7",
      indexName: "vuejs_cn2",
      type: "algolia",
      homepage: "https://vuejs.org/",
      searchParameters: {
        facetFilters: ["version:v3"],
      },
    },
    "V2 en-US": {
      icon: "../assets/logo/vue.png",
      apiKey: "f49cbd92a74532cc55cfbffa5e5a7d01",
      appId: "ML0LEBN7FQ",
      indexName: "vuejs",
      type: "algolia",
      homepage: "https://v2.vuejs.org/",
      searchParameters: {
        facetFilters: ["version:v2"],
      },
    },
    "V2 zh-CN": {
      icon: "../assets/logo/vue.png",
      apiKey: "c23eb8e7895f42daeaf2bf6f63eb4bf6",
      appId: "UURH1MHAF7",
      indexName: "vuejs_cn2",
      type: "algolia",
      homepage: "https://v2.cn.vuejs.org/",
      searchParameters: {
        facetFilters: ["version:v2"],
      },
    },
  },
  [DocID.VueUse]: {
    "en-US": {
      icon: "../assets/logo/vueuse.png",
      apiKey: "a99ef8de1b2b27949975ce96642149c6",
      appId: "BH4D9OD16A",
      indexName: "vueuse",
      type: "algolia",
      homepage: "https://vueuse.org/",
    },
  },
  [DocID.Vuepress]: {
    "V2 en-US": {
      icon: "../assets/logo/vuepress.png",
      apiKey: "9a9058b8655746634e01071411c366b8",
      appId: "34YFD9IUQ2",
      indexName: "vuepress",
      searchParameters: {
        attributesToRetrieve: [
          "hierarchy.lvl0",
          "hierarchy.lvl1",
          "hierarchy.lvl2",
          "hierarchy.lvl3",
          "hierarchy.lvl4",
          "hierarchy.lvl5",
          "hierarchy.lvl6",
          "content",
          "type",
          "url",
        ],
      },
      type: "algolia",
      homepage: "https://v2.vuepress.vuejs.org/",
    },
    "V2 zh-CN": {
      icon: "../assets/logo/vuepress.png",
      apiKey: "9a9058b8655746634e01071411c366b8",
      appId: "34YFD9IUQ2",
      indexName: "vuepress",
      searchParameters: {
        attributesToRetrieve: [
          "hierarchy.lvl0",
          "hierarchy.lvl1",
          "hierarchy.lvl2",
          "hierarchy.lvl3",
          "hierarchy.lvl4",
          "hierarchy.lvl5",
          "hierarchy.lvl6",
          "content",
          "type",
          "url",
        ],
        facetFilters: ["lang:zh-CN", "tags:v2"],
      },
      type: "algolia",
      homepage: "https://v2.vuepress.vuejs.org/zh/",
    },
    "V1 en-US": {
      icon: "../assets/logo/vuepress.png",
      apiKey: "3a539aab83105f01761a137c61004d85",
      appId: "BH4D9OD16A",
      indexName: "vuepress",
      type: "algolia",
      homepage: "https://vuepress.vuejs.org/",
    },
    "V1 zh-CN": {
      icon: "../assets/logo/vuepress.png",
      apiKey: "3a539aab83105f01761a137c61004d85",
      appId: "BH4D9OD16A",
      indexName: "vuepress",
      type: "algolia",
      homepage: "https://vuepress.vuejs.org/zh/",
      searchParameters: {
        facetFilters: ["lang:zh-CN", "tags:v1"],
      },
    },
  },
  [DocID.TypeScript]: {
    "en-US": {
      icon: "../assets/logo/typescript.png",
      apiKey: "37ee06fa68db6aef451a490df6df7c60",
      appId: "BGCDYOIYZ5",
      indexName: "typescriptlang",
      type: "algolia",
      homepage: "https://www.typescriptlang.org",
    },
    "zh-CN": {
      icon: "../assets/logo/typescript.png",
      apiKey: "feff649032d8034cf2a636ef55d96054",
      appId: "43GX903BPS",
      indexName: "ts-yayujs",
      type: "algolia",
      homepage: "https://yayujs.com/",
    },
  },
  [DocID.NextJS]: {
    "en-US App": {
      icon: "../assets/logo/nextjs.png",
      apiKey: "948b42d1edd177a55c6d6ae8dab24621",
      appId: "NNTAHQI9C5",
      indexName: "nextjs_docs_canary",
      type: "algolia",
      homepage: "https://nextjs.org/docs",
      searchParameters: {
        filters: "isApp:true",
      },
    },
    "en-US Pages": {
      icon: "../assets/logo/nextjs.png",
      apiKey: "948b42d1edd177a55c6d6ae8dab24621",
      appId: "NNTAHQI9C5",
      indexName: "nextjs_docs_canary",
      type: "algolia",
      homepage: "https://nextjs.org/docs",
      searchParameters: {
        filters: "isPages:true",
      },
    },
  },
  [DocID.MassTransit]: {
    "en-US": {
      icon: "../assets/logo/masstransit.png",
      apiKey: "c1b63b1b97fd65692eaf194862ce532b",
      appId: "TGRVKMJDRV",
      indexName: "masstransit_io",
      type: "algolia",
      homepage: "https://masstransit.io/",
      searchParameters: {
        facetFilters: ["lang:en"],
        attributesToRetrieve: [
          "hierarchy.lvl0",
          "hierarchy.lvl1",
          "hierarchy.lvl2",
          "hierarchy.lvl3",
          "hierarchy.lvl4",
          "hierarchy.lvl5",
          "hierarchy.lvl6",
          "content",
          "type",
          "url",
        ],
        attributesToSnippet: [
          "hierarchy.lvl1:5",
          "hierarchy.lvl2:5",
          "hierarchy.lvl3:5",
          "hierarchy.lvl4:5",
          "hierarchy.lvl5:5",
          "hierarchy.lvl6:5",
          "content:5",
        ],
      },
    },
  },
  [DocID.Pinia]: {
    "en-US": {
      icon: "../assets/logo/pinia.png",
      apiKey: "45441f4b65a2f80329fd45c7cb371fea",
      appId: "69Y3N7LHI2",
      indexName: "pinia",
      type: "algolia",
      homepage: "https://pinia.vuejs.org/",
      searchParameters: {
        facetFilters: ["lang:en-US"],
        attributesToRetrieve: [
          "hierarchy.lvl0",
          "hierarchy.lvl1",
          "hierarchy.lvl2",
          "hierarchy.lvl3",
          "hierarchy.lvl4",
          "hierarchy.lvl5",
          "hierarchy.lvl6",
          "content",
          "type",
          "url",
        ],
        attributesToSnippet: [
          "hierarchy.lvl1:5",
          "hierarchy.lvl2:5",
          "hierarchy.lvl3:5",
          "hierarchy.lvl4:5",
          "hierarchy.lvl5:5",
          "hierarchy.lvl6:5",
          "content:5",
        ],
      },
    },
  },
};
