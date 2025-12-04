import { SHADCN_SVELTE } from "./constants";
import { Action, List, ActionPanel } from "@raycast/api";
const shadcnSvelteDocs = [
  {
    name: "Getting started",
    pages: [
      {
        doc: "introduction",
        name: "Introduction",
        path: `${SHADCN_SVELTE.DOCS_BASE_URL}/introduction`,
      },
      {
        doc: "installation",
        name: "Installation",
        path: `${SHADCN_SVELTE.DOCS_BASE_URL}/installation`,
      },
      {
        doc: "components.json",
        name: "Components.json",
        path: `${SHADCN_SVELTE.DOCS_BASE_URL}/components-json`,
      },
      {
        doc: "theming",
        name: "Theming",
        path: `${SHADCN_SVELTE.DOCS_BASE_URL}/theming`,
      },
      {
        doc: "dark-mode",
        name: "Dark Mode",
        path: `${SHADCN_SVELTE.DOCS_BASE_URL}/dark-mode`,
      },
      {
        doc: "cli",
        name: "CLI",
        path: `${SHADCN_SVELTE.DOCS_BASE_URL}/cli`,
      },
      {
        doc: "typography",
        name: "Typography",
        path: `${SHADCN_SVELTE.DOCS_BASE_URL}/typography`,
      },
      {
        doc: "figma",
        name: "Figma",
        path: `${SHADCN_SVELTE.DOCS_BASE_URL}/figma`,
      },
      {
        doc: "changelog",
        name: "Changelog",
        path: `${SHADCN_SVELTE.DOCS_BASE_URL}/changelog`,
      },
      {
        doc: "about",
        name: "About",
        path: `${SHADCN_SVELTE.DOCS_BASE_URL}/about`,
      },
    ],
  },
  {
    name: "Installation",
    pages: [
      {
        doc: "vite",
        name: "Vite",
        path: `${SHADCN_SVELTE.DOCS_BASE_URL}/installation/vite`,
      },
      {
        doc: "sveltekit",
        name: "SvelteKit",
        path: `${SHADCN_SVELTE.DOCS_BASE_URL}/installation/sveltekit`,
      },
      {
        doc: "astro",
        name: "Astro",
        path: `${SHADCN_SVELTE.DOCS_BASE_URL}/installation/astro`,
      },
      {
        doc: "manual",
        name: "Manual",
        path: `${SHADCN_SVELTE.DOCS_BASE_URL}/installation/manual`,
      },
    ],
  },
  {
    name: "Dark Mode",
    pages: [
      {
        doc: "svelte",
        name: "Svelte",
        path: `${SHADCN_SVELTE.DOCS_BASE_URL}/dark-mode/svelte`,
      },
      {
        doc: "astro",
        name: "Astro",
        path: `${SHADCN_SVELTE.DOCS_BASE_URL}/dark-mode/astro`,
      },
    ],
  },
];
const SearchDocumentation = () => {
  return (
    <List searchBarPlaceholder="Search documentation">
      {shadcnSvelteDocs.map((documentation) => {
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
