import { Toast } from "@raycast/api";

export const LIBRARY_URLS = {
  shadcn: {
    base: "https://ui.shadcn.com",
    components: "https://ui.shadcn.com/docs/components",
  },
  primeng: {
    base: "https://primeng.dev",
    // Component list from the showcase sidebar menu data (structured JSON).
    menu: "https://raw.githubusercontent.com/primefaces/primeng/master/apps/showcase/assets/data/menu.json",
  },
  material: {
    base: "https://material.angular.dev",
    // Component list from the docs app's documentation-items registry.
    docItems:
      "https://raw.githubusercontent.com/angular/components/main/docs/src/app/shared/documentation-items/documentation-items.ts",
  },
  spartan: {
    base: "https://spartan.ng",
    components: "https://spartan.ng/components",
  },
  taiga: {
    base: "https://taiga-ui.dev",
    components: "https://taiga-ui.dev/components",
    // Component list from the demo app route registry (plain TS).
    routes: "https://raw.githubusercontent.com/taiga-family/taiga-ui/main/projects/demo/src/pages/app/demo-routes.ts",
  },
  mantine: {
    base: "https://mantine.dev",
    sitemap: "https://mantine.dev/sitemap.xml",
    components: "https://mantine.dev/core",
  },
  reactSpectrum: {
    base: "https://react-spectrum.adobe.com",
  },
  chakra: {
    base: "https://chakra-ui.com",
    components: "https://chakra-ui.com/docs/components",
    overview: "https://chakra-ui.com/docs/components/concepts/overview",
  },
} as const;

export const CREATE_ERROR_TOAST_OPTIONS = (e: Error): Toast.Options => ({
  style: Toast.Style.Failure,
  title: "Request failed 🔴",
  message: e.message || "Please try again later 🙏",
});
