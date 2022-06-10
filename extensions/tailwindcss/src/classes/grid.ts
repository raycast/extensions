import { TailwindConfig, Titles, symbols, spacing, columns, rows } from "./types";

export default (Tailwind: TailwindConfig) => {
  // grid-template-rows
  rows.forEach((n) => {
    Tailwind[Titles.GridTemplateRows][`grid-rows-${n}`] = {
      value: `grid-template-rows: repeat(${n}, minmax(0, 1fr))`,
      description: "",
    };
  });
  // grid-template-columns
  columns.forEach((n) => {
    Tailwind[Titles.GridTemplateColumns][`grid-col-${n}`] = {
      value: `grid-template-columns: repeat(${n}, minmax(0, 1fr))`,
      description: "",
    };
  });

  [...columns, 13].forEach((n) => {
    Tailwind[Titles.GridColumn][`col-start-${n}`] = {
      value: `grid-column-start: ${n}`,
      description: "",
    };
    Tailwind[Titles.GridColumn][`col-end-${n}`] = {
      value: `grid-column-end: ${n}`,
      description: "",
    };
    Tailwind[Titles.GridColumn][`col-span-${n}`] = {
      value: `grid-column: span ${n} / span ${n}`,
      description: "",
    };
    delete Tailwind[Titles.GridColumn][`col-span-${13}`];
  });

  // grid-row, start/end
  [...rows, 7].forEach((n) => {
    Tailwind[Titles.GridRow][`row-start-${n}`] = {
      value: `grid-row-start: ${n}`,
      description: "",
    };
    Tailwind[Titles.GridRow][`row-end-${n}`] = {
      value: `grid-row-end: ${n}`,
      description: "",
    };
    Tailwind[Titles.GridRow][`row-span-${n}`] = {
      value: `grid-row: ${n}`,
      description: "",
    };
    delete Tailwind[Titles.GridRow][`row-span-${7}`];
  });

  // gap
  spacing.forEach((n) => {
    Tailwind[Titles.Gap][`gap-${n}`] = {
      value: `gap: ${n}rem`,
      description: ` ${n * 4}px `,
    };
    Tailwind[Titles.Gap][`gap-x-${n}`] = {
      value: `columns-gap: ${n}rem`,
      description: ` ${n * 4}px `,
    };
    Tailwind[Titles.Gap][`gap-y-${n}`] = {
      value: `rows-gap: ${n}rem`,
      description: ` ${n * 4}px `,
    };
  });

  // gap
  symbols
    .filter(({ desc }) => Boolean(desc))
    .forEach(({ v, desc = "", key }) => {
      Tailwind[Titles.Gap][`gap-${key}`] = {
        value: `gap: ${v}`,
        description: desc,
      };
      Tailwind[Titles.Gap][`gap-x-${key}`] = {
        value: `column-gap: ${v}`,
        description: desc,
      };
      Tailwind[Titles.Gap][`gap-y-${key}`] = {
        value: `row-gap: ${v}`,
        description: desc,
      };
    });
};
