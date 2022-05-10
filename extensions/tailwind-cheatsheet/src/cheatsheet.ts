import { Titles, TailwindConfig } from "./types";
import addPaddingConfig from "./padding";
import addPositions from "./position";
import addGrid from './grid';
import addMargin from './margin';
import addOpacity from './opacity';

const Tailwind: TailwindConfig = {
  [Titles.Breakpoints]: {
    sm: {
      desc: "Minimum width 640px",
      value: `@media (min-width: 640px) { ... }`,
    },
    md: {
      desc: "Minimum width 768px",
      value: `@media (min-width: 768px) { ... }`,
    },
    lg: {
      desc: "Minimum width 1024px",
      value: `@media (min-width: 1024px) { ... }`,
    },
    xl: {
      desc: "Minimum width 1280px",
      value: `@media (min-width: 1280px) { ... }`,
    },
    "2xl": {
      desc: "Minimum width 1536px",
      value: `@media (min-width: 1536px) { ... }`,
    },
  },
  [Titles.BoxDecorationBreak]: {
    "box-decoration-clone": {
      value: `box-decoration-break: clone`,
      desc: "",
    },
    "box-decoration-slice": {
      value: "box-decoration-break: slice;",
      desc: "",
    },
  },
  [Titles.Container]: {
    container: {
      value: `container`,
      desc: `sm max-width: 640px; md max-width: 768px; lg	max-width: 1024px; xl	max-width: 1280px; 2xl	max-width: 1536px`,
    },
  },
  [Titles.BoxSizing]: {
    "box-border": {
      value: `box-sizing: border-box`,
      desc: "",
    },
    "box-content": {
      value: `box-sizing: content-box`,
      desc: "",
    },
  },
  [Titles.Display]: {
    hidden: {
      value: `display: none`,
      desc: "",
    },
    block: {
      value: `display: block`,
      desc: "",
    },
    "inline-block": {
      value: `display: inline-block`,
      desc: "",
    },
    inline: {
      value: `display: inline`,
      desc: "",
    },
    flex: {
      value: `display: flex`,
      desc: "",
    },
    "inline-flex": {
      value: `display: inline-flex`,
      desc: "",
    },
    table: {
      value: `display: table`,
      desc: "",
    },
    "inline-table": {
      value: `display: inline-table`,
      desc: "",
    },
    "table-caption": {
      value: `display: table-caption`,
      desc: "",
    },
    "table-cell": {
      value: `display: table-cell`,
      desc: "",
    },
    "table-column": {
      value: `display: table-column`,
      desc: "",
    },
    "table-column-group": {
      value: `display: table-column-group`,
      desc: "",
    },
    "table-footer-group": {
      value: `display: table-footer-group`,
      desc: "",
    },
    "table-header-group": {
      value: `display: table-header-group`,
      desc: "",
    },
    "table-row": {
      value: `display: table-row`,
      desc: "",
    },
    "table-row-group": {
      value: `display: table-row-group`,
      desc: "",
    },
    "flow-root": {
      value: `display: flow-root`,
      desc: "",
    },
    grid: {
      value: `display: grid`,
      desc: "",
    },
    "inline-grid": {
      value: `display: inline-grid`,
      desc: "",
    },
    contents: {
      value: `display: contents`,
      desc: "",
    },
    "list-item": {
      value: `display: list-item`,
      desc: "",
    },
  },
  [Titles.Float]: {
    "float-right": {
      value: "float: right;",
      desc: "",
    },
    "float-left": {
      value: "float: left;",
      desc: "",
    },
    "float-none": {
      value: "float: none;",
      desc: "",
    },
  },
  [Titles.Clear]: {
    "clear-right": {
      value: "clear: right;",
      desc: "",
    },
    "clear-left": {
      value: "clear: left;",
      desc: "",
    },
    "clear-both": {
      value: "clear: both;",
      desc: "",
    },
    "clear-none": {
      value: "clear: none;",
      desc: "",
    },
  },
  [Titles.Isolation]: {
    isolate: {
      value: "isolation: isolate;",
      desc: "",
    },
    "isolate-auto": {
      value: "isolation: auto;",
      desc: "",
    },
  },
  [Titles.ObjectFit]: {
    "object-cover": {
      value: "object-fit: cover;",
      desc: "",
    },
    "object-contain": {
      value: "object-fit: contain;",
      desc: "",
    },
    "object-fill": {
      value: "object-fit: fill;",
      desc: "",
    },
    "object-none": {
      value: "object-fit: none;",
      desc: "",
    },
    "object-scale-down": {
      value: "object-fit: scale-down;",
      desc: "",
    },
  },
  [Titles.ObjectPosition]: {
    "object-bottom": {
      value: "object-position: bottom;",
      desc: "",
    },
    "object-center": {
      value: "object-position: center;",
      desc: "",
    },
    "object-left": {
      value: "object-position: left;",
      desc: "",
    },
    "object-right": {
      value: "object-position: right;",
      desc: "",
    },
    "object-top": {
      value: "object-position: top;",
      desc: "",
    },
    "object-right-bottom": {
      value: "object-position: right bottom;",
      desc: "",
    },
    "object-right-top": {
      value: "object-position: right top;",
      desc: "",
    },
    "object-left-bottom": {
      value: "object-position: left bottom;",
      desc: "",
    },
    "object-left-top": {
      value: "object-position: left top;",
      desc: "",
    },
  },
  [Titles.Overflow]: {
    "overflow-auto": {
      value: "overflow: auto;",
      desc: "",
    },
    "overflow-hidden": {
      value: "overflow: hidden;",
      desc: "",
    },
    "overflow-scroll": {
      value: "overflow: scroll;",
      desc: "",
    },
    "overflow-visible": {
      value: "overflow: visible;",
      desc: "",
    },
    "overflow-x-auto": {
      value: "overflow-x: auto;",
      desc: "",
    },
    "overflow-x-hidden": {
      value: "overflow-x: hidden;",
      desc: "",
    },
    "overflow-x-scroll": {
      value: "overflow-x: scroll;",
      desc: "",
    },
    "overflow-x-visible": {
      value: "overflow-x: visible;",
      desc: "",
    },
    "overflow-y-auto": {
      value: "overflow-y: auto;",
      desc: "",
    },
    "overflow-y-hidden": {
      value: "overflow-y: hidden;",
      desc: "",
    },
    "overflow-y-scroll": {
      value: "overflow-y: scroll;",
      desc: "",
    },
    "overflow-y-visible": {
      value: "overflow-y: visible;",
      desc: "",
    },
  },
  [Titles.Overscroll]: {
    "overscroll-auto": {
      value: "overscroll-behavior: auto;",
      desc: "",
    },
    "overscroll-contain": {
      value: "overscroll-behavior: contain;",
      desc: "",
    },
    "overscroll-none": {
      value: "overscroll-behavior: none;",
      desc: "",
    },
    "overscroll-y-auto": {
      value: "overscroll-behavior-y: auto;",
      desc: "",
    },
    "overscroll-y-contain": {
      value: "overscroll-behavior-y: contain;",
      desc: "",
    },
    "overscroll-y-none": {
      value: "overscroll-behavior-y: none;",
      desc: "",
    },
    "overscroll-x-auto": {
      value: "overscroll-behavior-x: auto;",
      desc: "",
    },
    "overscroll-x-contain": {
      value: "overscroll-behavior-x: contain;",
      desc: "",
    },
    "overscroll-x-none": {
      value: "overscroll-behavior-x: none;",
      desc: "",
    },
  },
  [Titles.Position]: {
    static: {
      value: "position: static;",
      desc: "",
    },
    absolute: {
      value: "position: absolute;",
      desc: "",
    },
    fixed: {
      value: "position: fixed;",
      desc: "",
    },
    relative: {
      value: "position: relative;",
      desc: "",
    },
    sticky: {
      value: "position: sticky;",
      desc: "",
    },
  },
  [Titles.TopRightBottomLeft]: {},
  [Titles.Visibility]: {
    visible: {
      value: "visibility: visible;",
      desc: "",
    },
    invisible: {
      value: "visibility: hidden;",
      desc: "",
    },
  },
  [Titles.ZIndex]: {
    "z-0": {
      value: "z-index: 0;",
      desc: "",
    },
    "z-10": {
      value: "z-index: 10;",
      desc: "",
    },
    "z-20": {
      value: "z-index: 20;",
      desc: "",
    },
    "z-30": {
      value: "z-index: 30;",
      desc: "",
    },
    "z-40": {
      value: "z-index: 40;",
      desc: "",
    },
    "z-50": {
      value: "z-index: 50;",
      desc: "",
    },
    "z-auto": {
      value: "z-index: auto;",
      desc: "",
    },
  },
  [Titles.GridTemplateColumns]: {
    // map columns
    "grid-cols-none": {
      value: "grid-template-columns: none;",
      desc: "",
    },
  },
  [Titles.GridColumn]: {
    // map columns
    "col-auto": {
      value: "grid-column: auto;",
      desc: "",
    },
    "col-start-auto": {
      value: "grid-column-start: auto;",
      desc: "",
    },
    "col-end-auto": {
      value: "grid-column-end: auto;",
      desc: "",
    },
    "col-span-full": {
      value: "grid-column: 1 / -1;",
      desc: "",
    },
  },
  [Titles.GridTemplateRows]: {
    // map rows
    "grid-rows-none": {
      value: "grid-template-rows: none;",
      desc: "",
    },
  },
  [Titles.GridRow]: {
    // map rows
    "row-span-full": {
      value: "grid-row: 1 / -1;",
      desc: "",
    },
    "row-start-auto": {
      value: "grid-row-start: auto;",
      desc: "",
    },
    "row-end-auto": {
      value: "grid-row-end: auto;",
      desc: "",
    },
  },
  [Titles.GridAutoFlow]: {
    "grid-flow-row": {
      value: "grid-auto-flow: row;",
      desc: "",
    },
    "grid-flow-col": {
      value: "grid-auto-flow: column;",
      desc: "",
    },
    "grid-flow-row-dens": {
      value: "grid-auto-flow: row dense;",
      desc: "",
    },
    "grid-flow-col-dens": {
      value: "grid-auto-flow: column dense;",
      desc: "",
    },
  },
  [Titles.GridAutoColumns]: {
    "auto-cols-auto": {
      value: "grid-auto-columns: auto;",
      desc: "",
    },
    "auto-cols-min": {
      value: "grid-auto-columns: min-content;",
      desc: "",
    },
    "auto-cols-max": {
      value: "grid-auto-columns: max-content;",
      desc: "",
    },
    "auto-cols-fr": {
      value: "grid-auto-columns: minmax(0, 1fr);",
      desc: "",
    },
  },
  [Titles.GridAutoRows]: {
    "auto-rows-auto": {
      value: "grid-auto-rows: auto;",
      desc: "",
    },
    "auto-rows-min": {
      value: "grid-auto-rows: min-content;",
      desc: "",
    },
    "auto-rows-max": {
      value: "grid-auto-rows: max-content;",
      desc: "",
    },
    "auto-rows-fr": {
      value: "grid-auto-rows: minmax(0, 1fr);",
      desc: "",
    },
  },
  [Titles.Gap]: {
    // map spacing
    "gap-px": {
      value: "gap: 1px;",
      desc: "",
    },
  },
  [Titles.Padding]: {
    "-p-px": {
      value: "padding: -1px",
      desc: "",
    },
    "-pl-px": {
      value: "padding-left: -1px",
      desc: "",
    },
    "-pr-px": {
      value: "padding-right: -1px",
      desc: "",
    },
    "-pt-px": {
      value: "padding-top: -1px",
      desc: "",
    },
    "-pb-px": {
      value: "padding-bottom: -1px",
      desc: "",
    },
    "p-px": {
      value: "padding: 1px",
      desc: "",
    },
    "pl-px": {
      value: "padding-left: 1px",
      desc: "",
    },
    "pr-px": {
      value: "padding-right: 1px",
      desc: "",
    },
    "pt-px": {
      value: "padding-top: 1px",
      desc: "",
    },
    "pb-px": {
      value: "padding-bottom: 1px",
      desc: "",
    },
  },
  [Titles.Margin]: {
    "-m-px": {
      value: "margin: -1px",
      desc: "",
    },
    "-ml-px": {
      value: "margin-left: -1px",
      desc: "",
    },
    "-mr-px": {
      value: "margin-right: -1px",
      desc: "",
    },
    "-mt-px": {
      value: "margin-top: -1px",
      desc: "",
    },
    "-b-px": {
      value: "margin-bottom: -1px",
      desc: "",
    },
    "m-px": {
      value: "margin: 1px",
      desc: "",
    },
    "ml-px": {
      value: "margin-left: 1px",
      desc: "",
    },
    "mr-px": {
      value: "margin-right: 1px",
      desc: "",
    },
    "mt-px": {
      value: "margin-top: 1px",
      desc: "",
    },
    "mb-px": {
      value: "margin-bottom: 1px",
      desc: "",
    },
  },
  [Titles.SpaceBetween]: {
    "space-x-reverse > * + *": {
      value: "--tw-space-x-reverse: 1;",
      desc: "",
    },
    "space-y-reverse > * + *": {
      value: "--tw-space-y-reverse: 1;",
      desc: "",
    },
    "space-x-px > * + *": {
      value: "margin-left: 1px;",
      desc: "",
    },
    "space-y-px > * + *": {
      value: "margin-top: 1px;",
      desc: "",
    },
  },
  [Titles.Opacity] : {}
};

addPaddingConfig(Tailwind);
addPositions(Tailwind);
addGrid(Tailwind);
addMargin(Tailwind);
addOpacity(Tailwind);


export default Tailwind;
