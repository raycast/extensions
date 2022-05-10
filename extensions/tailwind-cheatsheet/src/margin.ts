import { TailwindConfig, Titles, spacing, symbols } from "./types";
export default (Tailwind: TailwindConfig) => {
  // margin
  spacing.forEach((n) => {
    Tailwind[Titles.Margin][`m-${n}`] = {
      value: `margin: ${n}rem`,
      desc: ` ${n * 4}px `,
    };
    Tailwind[Titles.Margin][`-m-${n}`] = {
      value: `margin: -${n}rem`,
      desc: ` -${n * 4}px `,
    };

    Tailwind[Titles.Margin][`mx-${n}`] = {
      value: `margin-left: ${n}rem; margin-right: ${n}rem`,
      desc: ` ${n * 4}px `,
    };
    Tailwind[Titles.Margin][`-mx-${n}`] = {
      value: `margin-left: -${n}rem; margin-right: -${n}rem`,
      desc: ` -${n * 4}px `,
    };

    Tailwind[Titles.Margin][`my-${n}`] = {
      value: `margin-top: ${n}rem; margin-bottom: ${n}rem`,
      desc: ` ${n * 4}px `,
    };
    Tailwind[Titles.Margin][`-my-${n}`] = {
      value: `margin-top: -${n}rem; margin-bottom: -${n}rem`,
      desc: ` -${n * 4}px `,
    };

    Tailwind[Titles.Margin][`mt-${n}`] = {
      value: `margin-top: ${n}rem`,
      desc: ` ${n * 4}px `,
    };
    Tailwind[Titles.Margin][`-mt-${n}`] = {
      value: `margin-top: -${n}rem`,
      desc: ` -${n * 4}px `,
    };

    Tailwind[Titles.Margin][`mb-${n}`] = {
      value: `margin-bottom: ${n}rem`,
      desc: ` ${n * 4}px `,
    };
    Tailwind[Titles.Margin][`-mb-${n}`] = {
      value: `margin-bottom: -${n}rem`,
      desc: ` -${n * 4}px `,
    };

    Tailwind[Titles.Margin][`ml-${n}`] = {
      value: `margin-left: ${n}rem`,
      desc: ` ${n * 4}px `,
    };
    Tailwind[Titles.Margin][`-ml-${n}`] = {
      value: `margin-left: -${n}rem`,
      desc: ` -${n * 4}px `,
    };

    Tailwind[Titles.Margin][`mr-${n}`] = {
      value: `margin-right: ${n}rem`,
      desc: ` ${n * 4}px `,
    };
    Tailwind[Titles.Margin][`-mr-${n}`] = {
      value: `margin-right: -${n}rem`,
      desc: ` -${n * 4}px `,
    };
  });
  symbols
    .filter(({ desc }) => Boolean(desc))
    .forEach(({ v, desc = "", key }) => {
      Tailwind[Titles.Margin][`m-${key}`] = {
        value: `margin: ${v}`,
        desc,
      };
      Tailwind[Titles.Margin][`-m-${key}`] = {
        value: `margin: -${v}`,
        desc,
      };
      Tailwind[Titles.Margin][`-mt-${key}`] = {
        value: `margin: -${v}`,
        desc,
      };
      Tailwind[Titles.Margin][`-mb-${key}`] = {
        value: `margin: -${v}`,
        desc,
      };
    });

  // space between
  spacing.forEach((n) => {
    Tailwind[Titles.SpaceBetween][`space-x-${n}`] = {
      value: `margin-left: ${n}rem`,
      desc: `.space-x-${n} > * + * { margin-left: ${n}rem /* ${n}px */ } `,
    };
    Tailwind[Titles.SpaceBetween][`space-y-${n}`] = {
      value: `margin-top: ${n}rem`,
      desc: `.space-y-${n} > * + * { margin-top: ${n}rem /* ${n}px */ } `,
    };
  });

  symbols
    .filter(({ desc }) => Boolean(desc))
    .forEach(({ key, v, desc = "" }) => {
      Tailwind[Titles.SpaceBetween][`space-x-${key}`] = {
        value: v,
        desc,
      };
    });
};
