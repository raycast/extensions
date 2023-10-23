import { getPreferenceValues } from "@raycast/api";
import { DocumentationEntry } from "../types/types";

const preferences = getPreferenceValues();
const lang = preferences.language ?? "en";

export const documentationListV3: DocumentationEntry[] = [
  /* Getting Started */
  { title: "Getting Started", url: `https://docs.astro.build/${lang}/getting-started/`, keywords: ["stort", "sturt"] },
  { title: "Installation", url: `https://docs.astro.build/${lang}/install/auto/` },
  { title: "Editor Setup", url: `https://docs.astro.build/${lang}/editor-setup/` },
  /* Upgrade Guides */
  { title: "Upgrade to Astro v3", url: `https://docs.astro.build/${lang}/guides/upgrade-to/v3/` },
  { title: "Upgrade to Astro v2", url: `https://docs.astro.build/${lang}/guides/upgrade-to/v2/` },
  /* Core Concepts */
  { title: "Why Astro", url: `https://docs.astro.build/${lang}/concepts/why-astro/` },
  { title: "Islands", url: `https://docs.astro.build/${lang}/concepts/islands/` },
  /* Tutorials */
  { title: "Build a blog (tutorial)", url: `https://docs.astro.build/${lang}/tutorial/0-introduction/` },
  {
    title: "Content Collections (tutorial)",
    url: `https://docs.astro.build/${lang}/tutorials/add-content-collections/`,
  },
  { title: "View Transitions (tutorial)", url: `https://docs.astro.build/${lang}/tutorials/add-view-transitions/` },
  /* Basics */
  { title: "Project Structure", url: `https://docs.astro.build/${lang}/core-concepts/project-structure/` },
  { title: "Components", url: `https://docs.astro.build/${lang}/core-concepts/astro-components/` },
  { title: "Pages", url: `https://docs.astro.build/${lang}/core-concepts/astro-pages/` },
  { title: "Layouts", url: `https://docs.astro.build/${lang}/core-concepts/layouts/` },
  /* Recipes */
  { title: "Migration Guides", url: `https://docs.astro.build/${lang}/guides/migrate-to-astro/` },
  { title: "CMS Guides", url: `https://docs.astro.build/${lang}/guides/cms/` },
  { title: "Backend Guides", url: `https://docs.astro.build/${lang}/guides/backend/` },
  { title: "Integrations", url: `https://docs.astro.build/${lang}/guides/integrations-guide/` },
  { title: "Deploy Guides", url: `https://docs.astro.build/${lang}/guides/deploy/` },
  { title: "Recipes", url: `https://docs.astro.build/${lang}/recipes/` },
  /* Guides */
  { title: "Astro Syntax", url: `https://docs.astro.build/${lang}/core-concepts/astro-syntax/` },
  { title: "Framework Components", url: `https://docs.astro.build/${lang}/core-concepts/framework-components/` },
  { title: "Routing", url: `https://docs.astro.build/${lang}/core-concepts/routing/` },
  { title: "Markdown & MDX", url: `https://docs.astro.build/${lang}/core-concepts/routing/` },
  { title: "Content Collections", url: `https://docs.astro.build/${lang}/guides/content-collections/` },
  { title: "Scripts & Event Handling", url: `https://docs.astro.build/${lang}/guides/client-side-scripts/` },
  { title: "CSS & Styling", url: `https://docs.astro.build/${lang}/guides/styling/` },
  { title: "Images", url: `https://docs.astro.build/${lang}/guides/images/` },
  { title: "Fonts", url: `https://docs.astro.build/${lang}/guides/fonts/` },
  { title: "Imports", url: `https://docs.astro.build/${lang}/guides/imports/` },
  { title: "Server Side Rendering (ssr)", url: `https://docs.astro.build/${lang}/guides/server-side-rendering/` },
  { title: "Endpoints", url: `https://docs.astro.build/${lang}/core-concepts/endpoints/` },
  { title: "Data Fetching", url: `https://docs.astro.build/${lang}/guides/data-fetching/` },
  { title: "Middleware", url: `https://docs.astro.build/${lang}/guides/middleware/` },
  { title: "Testing", url: `https://docs.astro.build/${lang}/guides/testing/` },
  { title: "View Transitions", url: `https://docs.astro.build/${lang}/guides/view-transitions/` },
  { title: "Troubleshooting", url: `https://docs.astro.build/${lang}/guides/troubleshooting/` },
  /* Configuration */
  { title: "Configuration", url: `https://docs.astro.build/${lang}/guides/configuring-astro/` },
  { title: "TypeScript", url: `https://docs.astro.build/${lang}/guides/typescript/` },
  { title: "Aliases", url: `https://docs.astro.build/${lang}/guides/aliases/` },
  { title: "Environment Variables", url: `https://docs.astro.build/${lang}/guides/environment-variables/` },
  /* Reference section */
  { title: "Configuration Reference", url: `https://docs.astro.build/${lang}/reference/configuration-reference/` },
  { title: "Runtime API Reference", url: `https://docs.astro.build/${lang}/reference/api-reference/` },
  { title: "Integration API Reference", url: `https://docs.astro.build/${lang}/reference/integrations-reference/` },
  { title: "Adapter API Reference", url: `https://docs.astro.build/${lang}/reference/adapter-reference/` },
  { title: "Image Service API Reference", url: `https://docs.astro.build/${lang}/reference/image-service-reference/` },
  { title: "Template Directives Reference", url: `https://docs.astro.build/${lang}/reference/directives-reference/` },
  { title: "CLI Reference", url: `https://docs.astro.build/${lang}/reference/cli-reference/` },
  { title: "Error Reference", url: `https://docs.astro.build/${lang}/reference/error-reference/` },
  { title: "Publish to NPM Reference", url: `https://docs.astro.build/${lang}/reference/publish-to-npm/` },
];
