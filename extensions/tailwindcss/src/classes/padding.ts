import { TailwindConfig, spacing, Titles, symbols } from "./types";

export default (Tailwind: TailwindConfig) => {
  spacing.forEach((n) => {
    Tailwind[Titles.Padding][`p-${n}`] = {
      value: `padding: ${n}rem`,
      description: ` ${n * 4}px `,
    };
    Tailwind[Titles.Padding][`-p-${n}`] = {
      value: `padding: -${n}rem`,
      description: ` -${n * 4}px `,
    };

    Tailwind[Titles.Padding][`px-${n}`] = {
      value: `padding-left: ${n}rem; padding-right: ${n}rem`,
      description: ` ${n * 4}px `,
    };
    Tailwind[Titles.Padding][`-px-${n}`] = {
      value: `padding-left: -${n}rem; padding-right: -${n}rem`,
      description: ` -${n * 4}px `,
    };

    Tailwind[Titles.Padding][`py-${n}`] = {
      value: `padding-top: ${n}rem; padding-bottom: ${n}rem`,
      description: ` ${n * 4}px `,
    };
    Tailwind[Titles.Padding][`-py-${n}`] = {
      value: `padding-top: -${n}rem; padding-bottom: -${n}rem`,
      description: ` -${n * 4}px `,
    };

    Tailwind[Titles.Padding][`pt-${n}`] = {
      value: `padding-top: ${n}rem`,
      description: ` ${n * 4}px `,
    };
    Tailwind[Titles.Padding][`-pt-${n}`] = {
      value: `padding-top: -${n}rem`,
      description: ` -${n * 4}px `,
    };

    Tailwind[Titles.Padding][`pb-${n}`] = {
      value: `padding-bottom: ${n}rem`,
      description: ` ${n * 4}px `,
    };
    Tailwind[Titles.Padding][`-pb-${n}`] = {
      value: `padding-bottom: -${n}rem`,
      description: ` -${n * 4}px `,
    };

    Tailwind[Titles.Padding][`pl-${n}`] = {
      value: `padding-left: ${n}rem`,
      description: ` ${n * 4}px `,
    };
    Tailwind[Titles.Padding][`-pl-${n}`] = {
      value: `padding-left: -${n}rem`,
      description: ` -${n * 4}px `,
    };

    Tailwind[Titles.Padding][`pr-${n}`] = {
      value: `padding-right: ${n}rem`,
      description: ` ${n * 4}px `,
    };
    Tailwind[Titles.Padding][`-pr-${n}`] = {
      value: `padding-right: -${n}rem`,
      description: ` -${n * 4}px `,
    };
  });

  // padding
  symbols
    .filter(({ desc }) => Boolean(desc))
    .forEach(({ v, desc = "", key }) => {
      Tailwind[Titles.Padding][`p-${key}`] = {
        value: `padding: ${v}`,
        description: desc,
      };
      Tailwind[Titles.Padding][`-p-${key}`] = {
        value: `padding: -${v}`,
        description: desc,
      };
      Tailwind[Titles.Padding][`-pt-${key}`] = {
        value: `padding: -${v}`,
        description: desc,
      };
      Tailwind[Titles.Padding][`-pb-${key}`] = {
        value: `padding: -${v}`,
        description: desc,
      };
    });
};
