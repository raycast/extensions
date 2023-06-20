/*
Documentation pulled manually from https://github.com/shadcn/ui/tree/main/apps/www/content/docs
For now we upload this file manually and update the date here
 */

const lastUpdated = "2023-06-06T20:16:30.458Z";

const documentationBase = "https://ui.shadcn.com/docs";

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
        doc: "theming",
        name: "Theming",
        path: `${documentationBase}/theming`,
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
    ],
  },
  {
    name: "Community",
    pages: [
      {
        doc: "figma",
        name: "Figma",
        path: `${documentationBase}/figma`,
      },
    ],
  },
  {
    name: "Forms",
    pages: [
      {
        doc: "react-hook-form",
        name: "React Hook Form",
        path: `${documentationBase}/forms/react-hook-form`,
      },
    ],
  },
];
