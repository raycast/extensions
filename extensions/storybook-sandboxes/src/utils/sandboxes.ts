export type Sandbox = {
  name: string;
  sbFramework: `@storybook/${string}` | `storybook-${string}`;
  uiFramework: string;
  uiFrameworkVersion: number | "Latest" | "Prerelease";
  builder: "Webpack" | "Vite";
  language: "JavaScript" | "TypeScript";
};

export type SandboxKey = string;

export const SANDBOX_GROUPS = [
  {
    title: "React",
    sandboxes: {
      "cra/default-js": {
        name: "Create React App Latest (JS)",
        sbFramework: "@storybook/react-webpack5",
        uiFramework: "React",
        uiFrameworkVersion: "Latest",
        builder: "Webpack",
        language: "JavaScript",
      },
      "cra/default-ts": {
        name: "Create React App Latest (TS)",
        sbFramework: "@storybook/react-webpack5",
        uiFramework: "React",
        uiFrameworkVersion: "Latest",
        builder: "Webpack",
        language: "TypeScript",
      },
      "nextjs/12-js": {
        name: "Next.js v12 (JS)",
        sbFramework: "@storybook/nextjs",
        uiFramework: "React",
        uiFrameworkVersion: 12,
        builder: "Webpack",
        language: "JavaScript",
      },
      "nextjs/default-js": {
        name: "Next.js Latest (JS)",
        sbFramework: "@storybook/nextjs",
        uiFramework: "React",
        uiFrameworkVersion: "Latest",
        builder: "Webpack",
        language: "JavaScript",
      },
      "nextjs/default-ts": {
        name: "Next.js Latest (TS)",
        sbFramework: "@storybook/nextjs",
        uiFramework: "React",
        uiFrameworkVersion: "Latest",
        builder: "Webpack",
        language: "TypeScript",
      },
      "react-vite/default-js": {
        name: "React Latest - Vite (JS)",
        sbFramework: "@storybook/react-vite",
        uiFramework: "React",
        uiFrameworkVersion: "Latest",
        builder: "Vite",
        language: "JavaScript",
      },
      "react-vite/default-ts": {
        name: "React Latest - Vite (TS)",
        sbFramework: "@storybook/react-vite",
        uiFramework: "React",
        uiFrameworkVersion: "Latest",
        builder: "Vite",
        language: "TypeScript",
      },
      "react-webpack/18-ts": {
        name: "React Latest - Webpack (TS)",
        sbFramework: "@storybook/react-webpack5",
        uiFramework: "React",
        uiFrameworkVersion: "Latest",
        builder: "Webpack",
        language: "TypeScript",
      },
      "react-webpack/17-ts": {
        name: "React Latest - Webpack (TS)",
        sbFramework: "@storybook/react-webpack5",
        uiFramework: "React",
        uiFrameworkVersion: 17,
        builder: "Webpack",
        language: "TypeScript",
      },
    },
  },
  {
    title: "Angular",
    sandboxes: {
      "angular-cli/default-ts": {
        name: "Angular CLI Latest",
        sbFramework: "@storybook/angular",
        uiFramework: "Angular",
        uiFrameworkVersion: "Latest",
        builder: "Webpack",
        language: "TypeScript",
      },
      "angular-cli/14-ts": {
        name: "Angular CLI v14",
        sbFramework: "@storybook/angular",
        uiFramework: "Angular",
        uiFrameworkVersion: 14,
        builder: "Webpack",
        language: "TypeScript",
      },
      "angular-cli/prerelease": {
        name: "Angular CLI Prerelease",
        sbFramework: "@storybook/angular",
        uiFramework: "Angular",
        uiFrameworkVersion: "Prerelease",
        builder: "Webpack",
        language: "TypeScript",
      },
    },
  },
  {
    title: "Vue",
    sandboxes: {
      "vue3-vite/default-js": {
        name: "Vue v3 - Vite (JS)",
        sbFramework: "@storybook/vue3",
        uiFramework: "Vue",
        uiFrameworkVersion: 3,
        builder: "Vite",
        language: "JavaScript",
      },
      "vue3-vite/default-ts": {
        name: "Vue v3 - Vite (TS)",
        sbFramework: "@storybook/vue3",
        uiFramework: "Vue",
        uiFrameworkVersion: 3,
        builder: "Vite",
        language: "TypeScript",
      },
      "vue2-vite/2.7-js": {
        name: "Vue v2 - Vite (JS)",
        sbFramework: "@storybook/vue",
        uiFramework: "Vue",
        uiFrameworkVersion: 2.7,
        builder: "Vite",
        language: "JavaScript",
      },
      "vue-cli/default-js": {
        name: "Vue v3 CLI (JS)",
        sbFramework: "@storybook/vue3",
        uiFramework: "Vue",
        uiFrameworkVersion: 3,
        builder: "Webpack",
        language: "JavaScript",
      },
      "vue-cli/vue2-default-js": {
        name: "Vue v2 CLI (JS)",
        sbFramework: "@storybook/vue",
        uiFramework: "Vue",
        uiFrameworkVersion: 2,
        builder: "Webpack",
        language: "JavaScript",
      },
    },
  },
  {
    title: "Svelte",
    sandboxes: {
      "svelte-vite/default-js": {
        name: "Svelte Latest - Vite (JS)",
        sbFramework: "@storybook/svelte",
        uiFramework: "Svelte",
        uiFrameworkVersion: "Latest",
        builder: "Vite",
        language: "JavaScript",
      },
      "svelte-vite/default-ts": {
        name: "Svelte Latest - Vite (TS)",
        sbFramework: "@storybook/svelte",
        uiFramework: "Svelte",
        uiFrameworkVersion: "Latest",
        builder: "Vite",
        language: "TypeScript",
      },
      "svelte-kit/skeleton-js": {
        name: "SvelteKit Latest (JS)",
        sbFramework: "@storybook/svelte",
        uiFramework: "Svelte",
        uiFrameworkVersion: "Latest",
        builder: "Vite",
        language: "JavaScript",
      },
      "svelte-kit/skeleton-ts": {
        name: "SvelteKit Latest (TS)",
        sbFramework: "@storybook/svelte",
        uiFramework: "Svelte",
        uiFrameworkVersion: "Latest",
        builder: "Vite",
        language: "TypeScript",
      },
    },
  },
  {
    title: "Preact",
    sandboxes: {
      "preact-webpack5/default-js": {
        name: "Preact Latest CLI (JS)",
        sbFramework: "@storybook/preact",
        uiFramework: "Preact",
        uiFrameworkVersion: "Latest",
        builder: "Webpack",
        language: "JavaScript",
      },
      "preact-webpack5/default-ts": {
        name: "Preact Latest CLI (TS)",
        sbFramework: "@storybook/preact",
        uiFramework: "Preact",
        uiFrameworkVersion: "Latest",
        builder: "Webpack",
        language: "TypeScript",
      },
      "preact-vite/default-js": {
        name: "Preact Latest - Vite (JS)",
        sbFramework: "@storybook/preact",
        uiFramework: "Preact",
        uiFrameworkVersion: "Latest",
        builder: "Vite",
        language: "JavaScript",
      },
      "preact-vite/default-ts": {
        name: "Preact Latest - Vite (TS)",
        sbFramework: "@storybook/preact",
        uiFramework: "Preact",
        uiFrameworkVersion: "Latest",
        builder: "Vite",
        language: "TypeScript",
      },
    },
  },
  {
    title: "Lit",
    sandboxes: {
      "lit-vite/default-js": {
        name: "Lit Latest - Vite (JS)",
        sbFramework: "@storybook/lit",
        uiFramework: "Lit",
        uiFrameworkVersion: "Latest",
        builder: "Vite",
        language: "JavaScript",
      },
      "lit-vite/default-ts": {
        name: "Lit Latest - Vite (TS)",
        sbFramework: "@storybook/lit",
        uiFramework: "Lit",
        uiFrameworkVersion: "Latest",
        builder: "Vite",
        language: "TypeScript",
      },
    },
  },
  {
    title: "HTML",
    sandboxes: {
      "html-webpack/default": {
        name: "HTML - Webpack",
        sbFramework: "@storybook/html",
        uiFramework: "HTML",
        uiFrameworkVersion: "Latest",
        builder: "Webpack",
        language: "JavaScript",
      },
      "html-vite/default-js": {
        name: "HTML - Vite (JS)",
        sbFramework: "@storybook/html",

        uiFramework: "HTML",
        uiFrameworkVersion: "Latest",
        builder: "Vite",
        language: "JavaScript",
      },
      "html-vite/default-ts": {
        name: "HTML - Vite (TS)",
        sbFramework: "@storybook/html",
        uiFramework: "HTML",
        uiFrameworkVersion: "Latest",
        builder: "Vite",
        language: "TypeScript",
      },
    },
  },
  {
    title: "SolidJS",
    sandboxes: {
      "solid-vite/default-js": {
        name: "SolidJS Latest - Vite (JS)",
        sbFramework: "storybook-solidjs-vite",
        uiFramework: "SolidJS",
        uiFrameworkVersion: "Latest",
        builder: "Vite",
        language: "JavaScript",
      },
      "solid-vite/default-ts": {
        name: "SolidJS Latest - Vite (TS)",
        sbFramework: "storybook-solidjs-vite",
        uiFramework: "SolidJS",
        uiFrameworkVersion: "Latest",
        builder: "Vite",
        language: "TypeScript",
      },
    },
  },

  {
    title: "Qwik",
    sandboxes: {
      "qwik-vite/default-ts": {
        name: "Qwik Latest CLI (TS)",
        sbFramework: "storybook-framework-qwik",
        uiFramework: "Qwik",
        uiFrameworkVersion: "Latest",
        builder: "Vite",
        language: "TypeScript",
      },
    },
  },
  {
    title: "Internal",
    sandboxes: {
      "internal/ssv6-vite": {
        name: "StoryStore v6 (react-vite/default-ts)",
        sbFramework: "@storybook/react-vite",
        uiFramework: "React",
        uiFrameworkVersion: "Latest",
        builder: "Vite",
        language: "TypeScript",
      },
      "internal/ssv6-webpack": {
        name: "StoryStore v6 (cra/default-ts)",
        sbFramework: "@storybook/react-webpack5",
        uiFramework: "React",
        uiFrameworkVersion: "Latest",
        builder: "Webpack",

        language: "TypeScript",
      },
    },
  },
] as const;
