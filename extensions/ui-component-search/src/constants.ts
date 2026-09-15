import { Toast } from "@raycast/api";

export const LIBRARY_URLS = {
  shadcn: {
    base: "https://ui.shadcn.com",
    components: "https://ui.shadcn.com/docs/components",
  },
  primeng: {
    base: "https://primeng.org",
  },
  material: {
    base: "https://material.angular.dev",
    components: "https://material.angular.dev/components/categories",
  },
  spartan: {
    base: "https://spartan.ng",
    components: "https://spartan.ng/components",
  },
  taiga: {
    base: "https://taiga-ui.dev",
    sitemap: "https://taiga-ui.dev/sitemap.xml",
    components: "https://taiga-ui.dev/components",
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
