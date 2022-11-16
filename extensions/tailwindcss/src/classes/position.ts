import { TailwindConfig, Titles, spacing, symbols } from "./types";

export default (Tailwind: TailwindConfig) => {
  // left top bottom right
  spacing.forEach((space) => {
    const positions = Tailwind[Titles.TopRightBottomLeft];

    positions[`inset-${space}`] = {
      value: `top: ${space}rem; right: ${space}rem; bottom: ${space}rem; left: ${space}rem`,
      description: ` ${space * 4}px `,
    };
    positions[`inset-x-${space}`] = {
      value: `top: ${space}rem; right: ${space}rem`,
      description: ` ${space * 4}px `,
    };
    positions[`inset-y-${space}`] = {
      value: `top: ${space}rem; bottom: ${space}rem`,
      description: ` ${space * 4}px `,
    };
    positions[`top-${space}`] = {
      value: `top: ${space}rem`,
      description: ` ${space * 4}px `,
    };
    positions[`right-${space}`] = {
      value: `right: ${space}rem`,
      description: ` ${space * 4}px `,
    };
    positions[`bottom-${space}`] = {
      value: `bottom: ${space}rem`,
      description: ` ${space * 4}px `,
    };
    positions[`left-${space}`] = {
      value: `left: ${space}rem`,
      description: ` ${space * 4}px `,
    };
  });

  // left top bottom right
  symbols.forEach((space) => {
    const { key, v, desc = "" } = space;
    const positions = Tailwind[Titles.TopRightBottomLeft];

    positions[`inset-${key}`] = {
      value: `top: ${v}; right: ${v}; bottom: ${v}; left: ${v}`,
      description: desc,
    };
    positions[`inset-x-${key}`] = {
      value: `top: ${v}; right: ${v}`,
      description: desc,
    };
    positions[`inset-y-${key}`] = {
      value: `top: ${v}; bottom: ${v}`,
      description: desc,
    };
    positions[`top-${key}`] = {
      value: `top: ${v}`,
      description: desc,
    };
    positions[`right-${key}`] = {
      value: `right: ${v}`,
      description: desc,
    };
    positions[`bottom-${key}`] = {
      value: `bottom: ${v}`,
      description: desc,
    };
    positions[`left-${key}`] = {
      value: `left: ${v}`,
      description: desc,
    };
  });
};
