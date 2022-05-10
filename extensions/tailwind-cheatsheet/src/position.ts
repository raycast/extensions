import { TailwindConfig, Titles, spacing, symbols, } from './types';
export default (Tailwind: TailwindConfig) => {

// left top bottom right
spacing.forEach((space) => {
  const positions = Tailwind[Titles.TopRightBottomLeft];

  positions[`inset-${space}`] = {
    value: `top: ${space}rem; right: ${space}rem; bottom: ${space}rem; left: ${space}rem`,
    desc: ` ${space * 4}px `,
  };
  positions[`inset-x-${space}`] = {
    value: `top: ${space}rem; right: ${space}rem`,
    desc: ` ${space * 4}px `,
  };
  positions[`inset-y-${space}`] = {
    value: `top: ${space}rem; bottom: ${space}rem`,
    desc: ` ${space * 4}px `,
  };
  positions[`top-${space}`] = {
    value: `top: ${space}rem`,
    desc: ` ${space * 4}px `,
  };
  positions[`right-${space}`] = {
    value: `right: ${space}rem`,
    desc: ` ${space * 4}px `,
  };
  positions[`bottom-${space}`] = {
    value: `bottom: ${space}rem`,
    desc: ` ${space * 4}px `,
  };
  positions[`left-${space}`] = {
    value: `left: ${space}rem`,
    desc: ` ${space * 4}px `,
  };
});

// left top bottom right
symbols.forEach((space) => {
  const { key, v, desc = "" } = space;
  const positions = Tailwind[Titles.TopRightBottomLeft];

  positions[`inset-${key}`] = {
    value: `top: ${v}; right: ${v}; bottom: ${v}; left: ${v}`,
    desc,
  };
  positions[`inset-x-${key}`] = {
    value: `top: ${v}; right: ${v}`,
    desc,
  };
  positions[`inset-y-${key}`] = {
    value: `top: ${v}; bottom: ${v}`,
    desc,
  };
  positions[`top-${key}`] = {
    value: `top: ${v}`,
    desc,
  };
  positions[`right-${key}`] = {
    value: `right: ${v}`,
    desc,
  };
  positions[`bottom-${key}`] = {
    value: `bottom: ${v}`,
    desc,
  };
  positions[`left-${key}`] = {
    value: `left: ${v}`,
    desc,
  };
});
}