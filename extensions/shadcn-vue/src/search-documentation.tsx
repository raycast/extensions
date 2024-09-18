import { SHADCN_VUE } from "./constants";
import { Action, List, ActionPanel } from "@raycast/api";
const shadcnVueDocs = [
  {
    name: "Getting started",
    pages: [
      {
        doc: "introduction",
        name: "Introduction",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/introduction`,
      },
      {
        doc: "installation",
        name: "Installation",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/installation`,
      },
      {
        doc: "components.json",
        name: "Components.json",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/components-json`,
      },
      {
        doc: "theming",
        name: "Theming",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/theming`,
      },
      {
        doc: "dark-mode",
        name: "Dark Mode",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/dark-mode`,
      },
      {
        doc: "cli",
        name: "CLI",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/cli`,
      },
      {
        doc: "typography",
        name: "Typography",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/typography`,
      },
      {
        doc: "figma",
        name: "Figma",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/figma`,
      },
      {
        doc: "changelog",
        name: "Changelog",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/changelog`,
      },
      {
        doc: "about",
        name: "About",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/about`,
      },
      {
        doc: "contribution",
        name: "Contribution",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/contribution`,
      },
    ],
  },
  {
    name: "Installation",
    pages: [
      {
        doc: "vite",
        name: "Vite",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/installation/vite`,
      },
      {
        doc: "nuxt",
        name: "Nuxt",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/installation/nuxt`,
      },
      {
        doc: "astro",
        name: "Astro",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/installation/astro`,
      },
      {
        doc: "laravel",
        name: "Laravel",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/installation/laravel`,
      },
    ],
  },
  {
    name: "Extended",
    pages: [
      {
        doc: "auto-form",
        name: "Auto Form",
        path: `${SHADCN_VUE.COMPONENTS_URL}/auto-form`,
      },
      {
        doc: "charts",
        name: "Charts",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/charts`,
      },
    ],
  },
  {
    name: "Dark Mode",
    pages: [
      {
        doc: "vite",
        name: "Vite",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/dark-mode/vite`,
      },
      {
        doc: "nuxt",
        name: "Nuxt",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/dark-mode/nuxt`,
      },
      {
        doc: "astro",
        name: "Astro",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/dark-mode/astro`,
      },
      {
        doc: "vitepress",
        name: "Vitepress",
        path: `${SHADCN_VUE.DOCS_BASE_URL}/dark-mode/vitepress`,
      },
    ],
  },
];
const SearchDocumentation = () => {
  return (
    <List searchBarPlaceholder="Search documentation">
      {shadcnVueDocs.map((documentation) => {
        const { name, pages } = documentation;
        return (
          <List.Section title={name} key={name}>
            {pages.map((page) => {
              const { doc, name, path } = page;
              return (
                <List.Item
                  title={name}
                  key={doc}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser url={path} />
                      <Action.CopyToClipboard title="Copy URL" content={path} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
};
export default SearchDocumentation;
