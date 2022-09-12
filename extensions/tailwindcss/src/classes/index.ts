import { Titles, TailwindConfig } from "./types";
import addPaddingConfig from "./padding";
import addPositions from "./position";
import addGrid from "./grid";
import addMargin from "./margin";
import addOpacity from "./opacity";

const Tailwind: TailwindConfig = {
  [Titles.Breakpoints]: {
    sm: {
      description: "Minimum width 640px",
      value: "@media (min-width: 640px) { ... }",
    },
    md: {
      description: "Minimum width 768px",
      value: "@media (min-width: 768px) { ... }",
    },
    lg: {
      description: "Minimum width 1024px",
      value: "@media (min-width: 1024px) { ... }",
    },
    xl: {
      description: "Minimum width 1280px",
      value: "@media (min-width: 1280px) { ... }",
    },
    "2xl": {
      description: "Minimum width 1536px",
      value: "@media (min-width: 1536px) { ... }",
    },
  },
  [Titles.BoxDecorationBreak]: {
    "box-decoration-clone": {
      value: "box-decoration-break: clone",
      description: "",
    },
    "box-decoration-slice": {
      value: "box-decoration-break: slice;",
      description: "",
    },
  },
  [Titles.Container]: {
    container: {
      value: "container",
      description:
        "sm max-width: 640px; md max-width: 768px; lg	max-width: 1024px; xl	max-width: 1280px; 2xl	max-width: 1536px",
    },
  },
  [Titles.BoxSizing]: {
    "box-border": {
      value: "box-sizing: border-box",
      description: "",
    },
    "box-content": {
      value: "box-sizing: content-box",
      description: "",
    },
  },
  [Titles.Display]: {
    hidden: {
      value: "display: none",
      description: "",
    },
    block: {
      value: "display: block",
      description: "",
    },
    "inline-block": {
      value: "display: inline-block",
      description: "",
    },
    inline: {
      value: "display: inline",
      description: "",
    },
    flex: {
      value: "display: flex",
      description: "",
    },
    "inline-flex": {
      value: "display: inline-flex",
      description: "",
    },
    table: {
      value: "display: table",
      description: "",
    },
    "inline-table": {
      value: "display: inline-table",
      description: "",
    },
    "table-caption": {
      value: "display: table-caption",
      description: "",
    },
    "table-cell": {
      value: "display: table-cell",
      description: "",
    },
    "table-column": {
      value: "display: table-column",
      description: "",
    },
    "table-column-group": {
      value: "display: table-column-group",
      description: "",
    },
    "table-footer-group": {
      value: "display: table-footer-group",
      description: "",
    },
    "table-header-group": {
      value: "display: table-header-group",
      description: "",
    },
    "table-row": {
      value: "display: table-row",
      description: "",
    },
    "table-row-group": {
      value: "display: table-row-group",
      description: "",
    },
    "flow-root": {
      value: "display: flow-root",
      description: "",
    },
    grid: {
      value: "display: grid",
      description: "",
    },
    "inline-grid": {
      value: "display: inline-grid",
      description: "",
    },
    contents: {
      value: "display: contents",
      description: "",
    },
    "list-item": {
      value: "display: list-item",
      description: "",
    },
  },
  [Titles.Float]: {
    "float-right": {
      value: "float: right;",
      description: "",
    },
    "float-left": {
      value: "float: left;",
      description: "",
    },
    "float-none": {
      value: "float: none;",
      description: "",
    },
  },
  [Titles.Clear]: {
    "clear-right": {
      value: "clear: right;",
      description: "",
    },
    "clear-left": {
      value: "clear: left;",
      description: "",
    },
    "clear-both": {
      value: "clear: both;",
      description: "",
    },
    "clear-none": {
      value: "clear: none;",
      description: "",
    },
  },
  [Titles.Isolation]: {
    isolate: {
      value: "isolation: isolate;",
      description: "",
    },
    "isolate-auto": {
      value: "isolation: auto;",
      description: "",
    },
  },
  [Titles.ObjectFit]: {
    "object-cover": {
      value: "object-fit: cover;",
      description: "",
    },
    "object-contain": {
      value: "object-fit: contain;",
      description: "",
    },
    "object-fill": {
      value: "object-fit: fill;",
      description: "",
    },
    "object-none": {
      value: "object-fit: none;",
      description: "",
    },
    "object-scale-down": {
      value: "object-fit: scale-down;",
      description: "",
    },
  },
  [Titles.ObjectPosition]: {
    "object-bottom": {
      value: "object-position: bottom;",
      description: "",
    },
    "object-center": {
      value: "object-position: center;",
      description: "",
    },
    "object-left": {
      value: "object-position: left;",
      description: "",
    },
    "object-right": {
      value: "object-position: right;",
      description: "",
    },
    "object-top": {
      value: "object-position: top;",
      description: "",
    },
    "object-right-bottom": {
      value: "object-position: right bottom;",
      description: "",
    },
    "object-right-top": {
      value: "object-position: right top;",
      description: "",
    },
    "object-left-bottom": {
      value: "object-position: left bottom;",
      description: "",
    },
    "object-left-top": {
      value: "object-position: left top;",
      description: "",
    },
  },
  [Titles.Overflow]: {
    "overflow-auto": {
      value: "overflow: auto;",
      description: "",
    },
    "overflow-hidden": {
      value: "overflow: hidden;",
      description: "",
    },
    "overflow-scroll": {
      value: "overflow: scroll;",
      description: "",
    },
    "overflow-visible": {
      value: "overflow: visible;",
      description: "",
    },
    "overflow-x-auto": {
      value: "overflow-x: auto;",
      description: "",
    },
    "overflow-x-hidden": {
      value: "overflow-x: hidden;",
      description: "",
    },
    "overflow-x-scroll": {
      value: "overflow-x: scroll;",
      description: "",
    },
    "overflow-x-visible": {
      value: "overflow-x: visible;",
      description: "",
    },
    "overflow-y-auto": {
      value: "overflow-y: auto;",
      description: "",
    },
    "overflow-y-hidden": {
      value: "overflow-y: hidden;",
      description: "",
    },
    "overflow-y-scroll": {
      value: "overflow-y: scroll;",
      description: "",
    },
    "overflow-y-visible": {
      value: "overflow-y: visible;",
      description: "",
    },
  },
  [Titles.Overscroll]: {
    "overscroll-auto": {
      value: "overscroll-behavior: auto;",
      description: "",
    },
    "overscroll-contain": {
      value: "overscroll-behavior: contain;",
      description: "",
    },
    "overscroll-none": {
      value: "overscroll-behavior: none;",
      description: "",
    },
    "overscroll-y-auto": {
      value: "overscroll-behavior-y: auto;",
      description: "",
    },
    "overscroll-y-contain": {
      value: "overscroll-behavior-y: contain;",
      description: "",
    },
    "overscroll-y-none": {
      value: "overscroll-behavior-y: none;",
      description: "",
    },
    "overscroll-x-auto": {
      value: "overscroll-behavior-x: auto;",
      description: "",
    },
    "overscroll-x-contain": {
      value: "overscroll-behavior-x: contain;",
      description: "",
    },
    "overscroll-x-none": {
      value: "overscroll-behavior-x: none;",
      description: "",
    },
  },
  [Titles.Position]: {
    static: {
      value: "position: static;",
      description: "",
    },
    absolute: {
      value: "position: absolute;",
      description: "",
    },
    fixed: {
      value: "position: fixed;",
      description: "",
    },
    relative: {
      value: "position: relative;",
      description: "",
    },
    sticky: {
      value: "position: sticky;",
      description: "",
    },
  },
  [Titles.TopRightBottomLeft]: {},
  [Titles.Visibility]: {
    visible: {
      value: "visibility: visible;",
      description: "",
    },
    invisible: {
      value: "visibility: hidden;",
      description: "",
    },
  },
  [Titles.ZIndex]: {
    "z-0": {
      value: "z-index: 0;",
      description: "",
    },
    "z-10": {
      value: "z-index: 10;",
      description: "",
    },
    "z-20": {
      value: "z-index: 20;",
      description: "",
    },
    "z-30": {
      value: "z-index: 30;",
      description: "",
    },
    "z-40": {
      value: "z-index: 40;",
      description: "",
    },
    "z-50": {
      value: "z-index: 50;",
      description: "",
    },
    "z-auto": {
      value: "z-index: auto;",
      description: "",
    },
  },
  [Titles.GridTemplateColumns]: {
    // map columns
    "grid-cols-none": {
      value: "grid-template-columns: none;",
      description: "",
    },
  },
  [Titles.GridColumn]: {
    // map columns
    "col-auto": {
      value: "grid-column: auto;",
      description: "",
    },
    "col-start-auto": {
      value: "grid-column-start: auto;",
      description: "",
    },
    "col-end-auto": {
      value: "grid-column-end: auto;",
      description: "",
    },
    "col-span-full": {
      value: "grid-column: 1 / -1;",
      description: "",
    },
  },
  [Titles.GridTemplateRows]: {
    // map rows
    "grid-rows-none": {
      value: "grid-template-rows: none;",
      description: "",
    },
  },
  [Titles.GridRow]: {
    // map rows
    "row-span-full": {
      value: "grid-row: 1 / -1;",
      description: "",
    },
    "row-start-auto": {
      value: "grid-row-start: auto;",
      description: "",
    },
    "row-end-auto": {
      value: "grid-row-end: auto;",
      description: "",
    },
  },
  [Titles.GridAutoFlow]: {
    "grid-flow-row": {
      value: "grid-auto-flow: row;",
      description: "",
    },
    "grid-flow-col": {
      value: "grid-auto-flow: column;",
      description: "",
    },
    "grid-flow-row-dens": {
      value: "grid-auto-flow: row dense;",
      description: "",
    },
    "grid-flow-col-dens": {
      value: "grid-auto-flow: column dense;",
      description: "",
    },
  },
  [Titles.GridAutoColumns]: {
    "auto-cols-auto": {
      value: "grid-auto-columns: auto;",
      description: "",
    },
    "auto-cols-min": {
      value: "grid-auto-columns: min-content;",
      description: "",
    },
    "auto-cols-max": {
      value: "grid-auto-columns: max-content;",
      description: "",
    },
    "auto-cols-fr": {
      value: "grid-auto-columns: minmax(0, 1fr);",
      description: "",
    },
  },
  [Titles.GridAutoRows]: {
    "auto-rows-auto": {
      value: "grid-auto-rows: auto;",
      description: "",
    },
    "auto-rows-min": {
      value: "grid-auto-rows: min-content;",
      description: "",
    },
    "auto-rows-max": {
      value: "grid-auto-rows: max-content;",
      description: "",
    },
    "auto-rows-fr": {
      value: "grid-auto-rows: minmax(0, 1fr);",
      description: "",
    },
  },
  [Titles.Gap]: {
    // map spacing
    "gap-px": {
      value: "gap: 1px;",
      description: "",
    },
  },
  [Titles.Padding]: {
    "-p-px": {
      value: "padding: -1px",
      description: "",
    },
    "-pl-px": {
      value: "padding-left: -1px",
      description: "",
    },
    "-pr-px": {
      value: "padding-right: -1px",
      description: "",
    },
    "-pt-px": {
      value: "padding-top: -1px",
      description: "",
    },
    "-pb-px": {
      value: "padding-bottom: -1px",
      description: "",
    },
    "p-px": {
      value: "padding: 1px",
      description: "",
    },
    "pl-px": {
      value: "padding-left: 1px",
      description: "",
    },
    "pr-px": {
      value: "padding-right: 1px",
      description: "",
    },
    "pt-px": {
      value: "padding-top: 1px",
      description: "",
    },
    "pb-px": {
      value: "padding-bottom: 1px",
      description: "",
    },
  },
  [Titles.Margin]: {
    "-m-px": {
      value: "margin: -1px",
      description: "",
    },
    "-ml-px": {
      value: "margin-left: -1px",
      description: "",
    },
    "-mr-px": {
      value: "margin-right: -1px",
      description: "",
    },
    "-mt-px": {
      value: "margin-top: -1px",
      description: "",
    },
    "-b-px": {
      value: "margin-bottom: -1px",
      description: "",
    },
    "m-px": {
      value: "margin: 1px",
      description: "",
    },
    "ml-px": {
      value: "margin-left: 1px",
      description: "",
    },
    "mr-px": {
      value: "margin-right: 1px",
      description: "",
    },
    "mt-px": {
      value: "margin-top: 1px",
      description: "",
    },
    "mb-px": {
      value: "margin-bottom: 1px",
      description: "",
    },
  },
  [Titles.SpaceBetween]: {
    "space-x-reverse > * + *": {
      value: "--tw-space-x-reverse: 1;",
      description: "",
    },
    "space-y-reverse > * + *": {
      value: "--tw-space-y-reverse: 1;",
      description: "",
    },
    "space-x-px > * + *": {
      value: "margin-left: 1px;",
      description: "",
    },
    "space-y-px > * + *": {
      value: "margin-top: 1px;",
      description: "",
    },
  },
  [Titles.Opacity]: {},
};

addPaddingConfig(Tailwind);
addPositions(Tailwind);
addGrid(Tailwind);
addMargin(Tailwind);
addOpacity(Tailwind);

export default Tailwind;
