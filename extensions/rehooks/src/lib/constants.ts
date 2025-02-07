import type { Page } from "../types";

export const BASE_URL = "https://rehooks.pyr33x.ir";
export const CLI_URL = `${BASE_URL}/docs/cli`;
export const API_URL = `${BASE_URL}/docs/api`;

const DOCS_PAGES: Page[] = [
  {
    title: "API Reference",
    description:
      "Rehooks API is a RESTFul API that allows you to get the details of the available hooks in the repository.",
    url: `${API_URL}`,
  },
  {
    title: "Introduction",
    description:
      "A CLI to scaffold your react custom hooks, with a focus on performance, reusability, and type-safety.",
    url: `${CLI_URL}`,
  },
  {
    title: "Endpoints",
    description: "Discover and explore the API route that best suits your needs.",
    url: `${API_URL}/list`,
  },
  {
    title: "Resources",
    description: "The list of tools that uses Rehooks API and useful resources for building custom hooks.",
    url: `${CLI_URL}/resources`,
  },
  {
    title: "Getting Started",
    description: "Get start with Rehooks and learn how to use it.",
    url: `${CLI_URL}/getting-started`,
  },
  {
    title: "Hooks",
    description: "Explore the hooks available in Rehooks.",
    url: `${CLI_URL}/hooks`,
  },
  {
    title: "Legal",
    description: "Learn about the legal information and terms of service for Rehooks.",
    url: `${CLI_URL}/legal`,
  },
];

export { DOCS_PAGES };
