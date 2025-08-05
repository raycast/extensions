import type { Config } from "@svgr/core";
import type { OptimizeOptions } from "svgo";

export const SVGR_DEFAULT: Config = {
  dimensions: true,
  memo: false,
  native: false,
  ref: false,
  svgo: true,
  titleProp: false,
  typescript: false,
  icon: false,
  expandProps: "end",
  exportType: "default",
  jsxRuntime: "classic",
};

export const SVGO_DEFAULT: OptimizeOptions = {
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          removeTitle: false,
        },
      },
    },
  ],
};

const CHECKBOX_META = {
  dimensions: {
    label: "Keep width and height attributes from root SVG tag.",
  },
  icon: {
    label: "Replace SVG width and height with '1em.'",
  },
  memo: {
    label: "Wrap the component in React.memo.",
  },
  native: {
    label: "Export as a React Native component.",
  },
  ref: {
    label: "Forward ref to the root SVG tag.",
  },
  svgo: {
    label: "Use SVGO to optimize SVG code.",
  },
  titleProp: {
    label: "Add title tag via title property.",
  },
  typescript: {
    label: "Generate React component with TypeScript typings.",
  },
};

const DROPDOWN_META = {
  expandProps: {
    label:
      'Props are forwarded to the SVG tag. Choose "start" or "end" to deliver props to their respective locations on the component\'s attribute list, or choose "none" to stop forwarding props.',
    options: ["end", "start", "none"],
  },
  exportType: {
    label: 'Export your React component as a "named" export or "default" export.',
    options: ["named", "default"],
  },
  jsxRuntime: {
    label: "Use a custom JSX runtime",
    options: ["classic", "classic-preact", "automatic"],
  },
};

export const SVGR_META = {
  ...CHECKBOX_META,
  ...DROPDOWN_META,
};

export const DROPDOWN_KEYS = Object.keys(DROPDOWN_META);

export type SvgrMetaKeys = keyof typeof SVGR_META;
export type DropdownKeys = keyof typeof DROPDOWN_META;
