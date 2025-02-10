/*
Documentation pulled manually from https://github.com/shadcn/ui/tree/main/apps/www/content/docs
For now we upload this file manually and update the date here
 */

const lastUpdated = "2024-01-15T12:03:16.024Z";

const documentationBase = "https://ui.shadcn.com/docs";
const documentationInstallation = `${documentationBase}/installation`;

export default [
  {
    name: "Getting Started",
    pages: [
      {
        doc: "introduction",
        name: "Introduction",
        path: `${documentationBase}/`,
      },
      {
        doc: "installation",
        name: "Installation",
        path: `${documentationBase}/installation`,
      },
      {
        doc: "components.json",
        name: "components.json",
        path: `${documentationBase}/components-json`,
      },
      {
        doc: "theming",
        name: "Theming",
        path: `${documentationBase}/theming`,
      },
      {
        doc: "dark-mode",
        name: "Dark Mode",
        path: `${documentationBase}/dark-mode`,
      },
      {
        doc: "cli",
        name: "CLI",
        path: `${documentationBase}/cli`,
      },
      {
        doc: "typography",
        name: "Typography",
        path: `${documentationBase}/components/typography`,
      },
      {
        doc: "figma",
        name: "Figma",
        path: `${documentationBase}/figma`,
      },
      {
        doc: "changelog",
        name: "Changelog",
        path: `${documentationBase}/changelog`,
      },
      {
        doc: "about",
        name: "About",
        path: `${documentationBase}/about`,
      },
    ],
  },
  {
    name: "Installation",
    pages: [
      {
        doc: "next",
        name: "Next.js",
        path: `${documentationInstallation}/next`,
      },
      {
        doc: "vite",
        name: "Vite",
        path: `${documentationInstallation}/vite`,
      },
      {
        doc: "remix",
        name: "Remix",
        path: `${documentationInstallation}/remix`,
      },
      {
        doc: "gatsby",
        name: "Gatsby",
        path: `${documentationInstallation}/gatsby`,
      },
      {
        doc: "astro",
        name: "Astro",
        path: `${documentationInstallation}/astro`,
      },
      {
        doc: "laravel",
        name: "Laravel",
        path: `${documentationInstallation}/laravel`,
      },
      {
        doc: "manual",
        name: "Manual",
        path: `${documentationInstallation}/manual`,
      },
    ],
  },
  {
    name: "Dark Mode",
    pages: [
      {
        doc: "next",
        name: "Next.js",
        path: `${documentationBase}/dark-mode/next`,
      },
      {
        doc: "vite",
        name: "Vite",
        path: `${documentationBase}/dark-mode/vite`,
      },
      {
        doc: "astro",
        name: "Astro",
        path: `${documentationBase}/dark-mode/astro`,
      },
      {
        doc: "remix",
        name: "Remix",
        path: `${documentationBase}/dark-mode/remix`,
      },
    ],
  },
];
