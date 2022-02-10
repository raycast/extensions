import { ActionPanel, List, OpenInBrowserAction, CopyToClipboardAction } from "@raycast/api";

export default function SearchDocumentation() {
  return (
    <List>
      {Object.entries(documentation).map(([section, items]) => (
        <List.Section title={section} key={section}>
          {items.map((item) => (
            <List.Item
              key={item.url}
              icon="tailwind-icon.png"
              title={item.title}
              keywords={[item.title, section]}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url={item.url} />
                  <CopyToClipboardAction title="Copy URL" content={item.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

const documentation = {
  "Getting Started": [
    {
      url: "https://tailwindcss.com/docs/browser-support",
      title: "Browser Support",
    },
    {
      url: "https://tailwindcss.com/docs/editor-support",
      title: "Editor Support",
    },
    {
      url: "https://tailwindcss.com/docs/installation",
      title: "Installation",
    },
    {
      url: "https://tailwindcss.com/docs/optimizing-for-production",
      title: "Optimizing for Production",
    },
    {
      url: "https://github.com/tailwindlabs/tailwindcss/releases",
      title: "Release Notes",
    },
    {
      url: "https://tailwindcss.com/docs/upgrading-to-v2",
      title: "Upgrade Guide",
    },
    {
      url: "https://tailwindcss.com/docs/using-with-preprocessors",
      title: "Using with Preprocessors",
    },
  ],
  "Core Concepts": [
    {
      url: "https://tailwindcss.com/docs/adding-base-styles",
      title: "Adding Base Styles",
    },
    {
      url: "https://tailwindcss.com/docs/adding-custom-styles",
      title: "Adding Custom Styles",
    },
    {
      url: "https://tailwindcss.com/docs/adding-new-utilities",
      title: "Adding New Utilities",
    },
    {
      url: "https://tailwindcss.com/docs/dark-mode",
      title: "Dark Mode",
    },
    {
      url: "https://tailwindcss.com/docs/extracting-components",
      title: "Extracting Components",
    },
    {
      url: "https://tailwindcss.com/docs/functions-and-directives",
      title: "Functions & Directives",
    },
    {
      url: "https://tailwindcss.com/docs/hover-focus-and-other-states",
      title: "Hover, Focus, & Other States",
    },
    {
      url: "https://tailwindcss.com/docs/responsive-design",
      title: "Responsive Design",
    },
    {
      url: "https://tailwindcss.com/docs/utility-first",
      title: "Utility-First",
    },
  ],
  Customization: [
    {
      url: "https://tailwindcss.com/docs/breakpoints",
      title: "Breakpoints",
    },
    {
      url: "https://tailwindcss.com/docs/customizing-colors",
      title: "Colors",
    },
    {
      url: "https://tailwindcss.com/docs/configuration",
      title: "Configuration",
    },
    {
      url: "https://tailwindcss.com/docs/just-in-time-mode",
      title: "Just-in-Time Mode",
    },
    {
      url: "https://tailwindcss.com/docs/plugins",
      title: "Plugins",
    },
    {
      url: "https://tailwindcss.com/docs/presets",
      title: "Presets",
    },
    {
      url: "https://tailwindcss.com/docs/customizing-spacing",
      title: "Spacing",
    },
    {
      url: "https://tailwindcss.com/docs/theme",
      title: "Theme",
    },
    {
      url: "https://tailwindcss.com/docs/configuring-variants",
      title: "Variants",
    },
  ],
  "Base Styles": [
    {
      url: "https://tailwindcss.com/docs/preflight",
      title: "Preflight",
    },
  ],
  Layout: [
    {
      url: "https://tailwindcss.com/docs/aspect-ratio",
      title: "Aspect Ratio",
    },
    {
      url: "https://tailwindcss.com/docs/box-decoration-break",
      title: "Box Decoration Break",
    },
    {
      url: "https://tailwindcss.com/docs/box-sizing",
      title: "Box Sizing",
    },
    {
      url: "https://tailwindcss.com/docs/break-after",
      title: "Break After",
    },
    {
      url: "https://tailwindcss.com/docs/break-before",
      title: "Break Before",
    },
    {
      url: "https://tailwindcss.com/docs/break-inside",
      title: "Break Inside",
    },
    {
      url: "https://tailwindcss.com/docs/clear",
      title: "Clear",
    },
    {
      url: "https://tailwindcss.com/docs/columns",
      title: "Columns",
    },
    {
      url: "https://tailwindcss.com/docs/container",
      title: "Container",
    },
    {
      url: "https://tailwindcss.com/docs/display",
      title: "Display",
    },
    {
      url: "https://tailwindcss.com/docs/float",
      title: "Floats",
    },
    {
      url: "https://tailwindcss.com/docs/isolation",
      title: "Isolation",
    },
    {
      url: "https://tailwindcss.com/docs/object-fit",
      title: "Object Fit",
    },
    {
      url: "https://tailwindcss.com/docs/object-position",
      title: "Object Position",
    },
    {
      url: "https://tailwindcss.com/docs/overflow",
      title: "Overflow",
    },
    {
      url: "https://tailwindcss.com/docs/overscroll-behavior",
      title: "Overscroll Behavior",
    },
    {
      url: "https://tailwindcss.com/docs/position",
      title: "Position",
    },
    {
      url: "https://tailwindcss.com/docs/top-right-bottom-left",
      title: "Top / Right / Bottom / Left",
    },
    {
      url: "https://tailwindcss.com/docs/visibility",
      title: "Visibility",
    },
    {
      url: "https://tailwindcss.com/docs/z-index",
      title: "Z-Index",
    },
  ],
  "Flexbox And Grid": [
    {
      url: "https://tailwindcss.com/docs/align-content",
      title: "Align Content",
    },
    {
      url: "https://tailwindcss.com/docs/align-items",
      title: "Align Items",
    },
    {
      url: "https://tailwindcss.com/docs/align-self",
      title: "Align Self",
    },
    {
      url: "https://tailwindcss.com/docs/flex",
      title: "Flex",
    },
    {
      url: "https://tailwindcss.com/docs/flex-direction",
      title: "Flex Direction",
    },
    {
      url: "https://tailwindcss.com/docs/flex-grow",
      title: "Flex Grow",
    },
    {
      url: "https://tailwindcss.com/docs/flex-shrink",
      title: "Flex Shrink",
    },
    {
      url: "https://tailwindcss.com/docs/flex-wrap",
      title: "Flex Wrap",
    },
    {
      url: "https://tailwindcss.com/docs/gap",
      title: "Gap",
    },
    {
      url: "https://tailwindcss.com/docs/grid-auto-columns",
      title: "Grid Auto Columns",
    },
    {
      url: "https://tailwindcss.com/docs/grid-auto-flow",
      title: "Grid Auto Flow",
    },
    {
      url: "https://tailwindcss.com/docs/grid-auto-rows",
      title: "Grid Auto Rows",
    },
    {
      url: "https://tailwindcss.com/docs/grid-column",
      title: "Grid Column Start / End",
    },
    {
      url: "https://tailwindcss.com/docs/grid-row",
      title: "Grid Row Start / End",
    },
    {
      url: "https://tailwindcss.com/docs/grid-template-columns",
      title: "Grid Template Columns",
    },
    {
      url: "https://tailwindcss.com/docs/grid-template-rows",
      title: "Grid Template Rows",
    },
    {
      url: "https://tailwindcss.com/docs/justify-content",
      title: "Justify Content",
    },
    {
      url: "https://tailwindcss.com/docs/justify-items",
      title: "Justify Items",
    },
    {
      url: "https://tailwindcss.com/docs/justify-self",
      title: "Justify Self",
    },
    {
      url: "https://tailwindcss.com/docs/order",
      title: "Order",
    },
    {
      url: "https://tailwindcss.com/docs/place-content",
      title: "Place Content",
    },
    {
      url: "https://tailwindcss.com/docs/place-items",
      title: "Place Items",
    },
    {
      url: "https://tailwindcss.com/docs/place-self",
      title: "Place Self",
    },
  ],
  Spacing: [
    {
      url: "https://tailwindcss.com/docs/margin",
      title: "Margin",
    },
    {
      url: "https://tailwindcss.com/docs/padding",
      title: "Padding",
    },
    {
      url: "https://tailwindcss.com/docs/space",
      title: "Space Between",
    },
  ],
  Sizing: [
    {
      url: "https://tailwindcss.com/docs/height",
      title: "Height",
    },
    {
      url: "https://tailwindcss.com/docs/max-height",
      title: "Max-Height",
    },
    {
      url: "https://tailwindcss.com/docs/max-width",
      title: "Max-Width",
    },
    {
      url: "https://tailwindcss.com/docs/min-height",
      title: "Min-Height",
    },
    {
      url: "https://tailwindcss.com/docs/min-width",
      title: "Min-Width",
    },
    {
      url: "https://tailwindcss.com/docs/width",
      title: "Width",
    },
  ],
  Typography: [
    {
      url: "https://tailwindcss.com/docs/font-family",
      title: "Font Family",
    },
    {
      url: "https://tailwindcss.com/docs/font-size",
      title: "Font Size",
    },
    {
      url: "https://tailwindcss.com/docs/font-smoothing",
      title: "Font Smoothing",
    },
    {
      url: "https://tailwindcss.com/docs/font-style",
      title: "Font Style",
    },
    {
      url: "https://tailwindcss.com/docs/font-variant-numeric",
      title: "Font Variant Numeric",
    },
    {
      url: "https://tailwindcss.com/docs/font-weight",
      title: "Font Weight",
    },
    {
      url: "https://tailwindcss.com/docs/letter-spacing",
      title: "Letter Spacing",
    },
    {
      url: "https://tailwindcss.com/docs/line-height",
      title: "Line Height",
    },
    {
      url: "https://tailwindcss.com/docs/list-style-position",
      title: "List Style Position",
    },
    {
      url: "https://tailwindcss.com/docs/list-style-type",
      title: "List Style Type",
    },
    {
      url: "https://tailwindcss.com/docs/placeholder-color",
      title: "Placeholder Color",
    },
    {
      url: "https://tailwindcss.com/docs/placeholder-opacity",
      title: "Placeholder Opacity",
    },
    {
      url: "https://tailwindcss.com/docs/text-align",
      title: "Text Align",
    },
    {
      url: "https://tailwindcss.com/docs/text-color",
      title: "Text Color",
    },
    {
      url: "https://tailwindcss.com/docs/text-decoration",
      title: "Text Decoration",
    },
    {
      url: "https://tailwindcss.com/docs/text-decoration-color",
      title: "Text Decoration Color",
    },
    {
      url: "https://tailwindcss.com/docs/text-decoration-style",
      title: "Text Decoration Style",
    },
    {
      url: "https://tailwindcss.com/docs/text-decoration-thickness",
      title: "Text Decoration Thickness",
    },
    {
      url: "https://tailwindcss.com/docs/text-opacity",
      title: "Text Opacity",
    },
    {
      url: "https://tailwindcss.com/docs/text-overflow",
      title: "Text Overflow",
    },
    {
      url: "https://tailwindcss.com/docs/text-transform",
      title: "Text Transform",
    },
    {
      url: "https://tailwindcss.com/docs/text-decoration-underline-offset",
      title: "Text Underline Offset",
    },
    {
      url: "https://tailwindcss.com/docs/vertical-align",
      title: "Vertical Align",
    },
    {
      url: "https://tailwindcss.com/docs/whitespace",
      title: "Whitespace",
    },
    {
      url: "https://tailwindcss.com/docs/word-break",
      title: "Word Break",
    },
  ],
  Backgrounds: [
    {
      url: "https://tailwindcss.com/docs/background-attachment",
      title: "Background Attachment",
    },
    {
      url: "https://tailwindcss.com/docs/background-clip",
      title: "Background Clip",
    },
    {
      url: "https://tailwindcss.com/docs/background-color",
      title: "Background Color",
    },
    {
      url: "https://tailwindcss.com/docs/background-image",
      title: "Background Image",
    },
    {
      url: "https://tailwindcss.com/docs/background-opacity",
      title: "Background Opacity",
    },
    {
      url: "https://tailwindcss.com/docs/background-origin",
      title: "Background Origin",
    },
    {
      url: "https://tailwindcss.com/docs/background-position",
      title: "Background Position",
    },
    {
      url: "https://tailwindcss.com/docs/background-repeat",
      title: "Background Repeat",
    },
    {
      url: "https://tailwindcss.com/docs/background-size",
      title: "Background Size",
    },
    {
      url: "https://tailwindcss.com/docs/gradient-color-stops",
      title: "Gradient Color Stops",
    },
  ],
  Borders: [
    {
      url: "https://tailwindcss.com/docs/border-color",
      title: "Border Color",
    },
    {
      url: "https://tailwindcss.com/docs/border-opacity",
      title: "Border Opacity",
    },
    {
      url: "https://tailwindcss.com/docs/border-radius",
      title: "Border Radius",
    },
    {
      url: "https://tailwindcss.com/docs/border-style",
      title: "Border Style",
    },
    {
      url: "https://tailwindcss.com/docs/border-width",
      title: "Border Width",
    },
    {
      url: "https://tailwindcss.com/docs/divide-color",
      title: "Divide Color",
    },
    {
      url: "https://tailwindcss.com/docs/divide-opacity",
      title: "Divide Opacity",
    },
    {
      url: "https://tailwindcss.com/docs/divide-style",
      title: "Divide Style",
    },
    {
      url: "https://tailwindcss.com/docs/divide-width",
      title: "Divide Width",
    },
    {
      url: "https://tailwindcss.com/docs/ring-color",
      title: "Ring Color",
    },
    {
      url: "https://tailwindcss.com/docs/ring-offset-color",
      title: "Ring Offset Color",
    },
    {
      url: "https://tailwindcss.com/docs/ring-offset-width",
      title: "Ring Offset Width",
    },
    {
      url: "https://tailwindcss.com/docs/ring-opacity",
      title: "Ring Opacity",
    },
    {
      url: "https://tailwindcss.com/docs/ring-width",
      title: "Ring Width",
    },
  ],
  Effects: [
    {
      url: "https://tailwindcss.com/docs/background-blend-mode",
      title: "Background Blend Mode",
    },
    {
      url: "https://tailwindcss.com/docs/box-shadow",
      title: "Box Shadow",
    },
    {
      url: "https://tailwindcss.com/docs/box-shadow-color",
      title: "Box Shadow Color",
    },
    {
      url: "https://tailwindcss.com/docs/mix-blend-mode",
      title: "Mix Blend Mode",
    },
    {
      url: "https://tailwindcss.com/docs/opacity",
      title: "Opacity",
    },
  ],
  Filters: [
    {
      url: "https://tailwindcss.com/docs/backdrop-blur",
      title: "Backdrop Blur",
    },
    {
      url: "https://tailwindcss.com/docs/backdrop-brightness",
      title: "Backdrop Brightness",
    },
    {
      url: "https://tailwindcss.com/docs/backdrop-contrast",
      title: "Backdrop Contrast",
    },
    {
      url: "https://tailwindcss.com/docs/backdrop-filter",
      title: "Backdrop Filter",
    },
    {
      url: "https://tailwindcss.com/docs/backdrop-grayscale",
      title: "Backdrop Grayscale",
    },
    {
      url: "https://tailwindcss.com/docs/backdrop-hue-rotate",
      title: "Backdrop Hue Rotate",
    },
    {
      url: "https://tailwindcss.com/docs/backdrop-invert",
      title: "Backdrop Invert",
    },
    {
      url: "https://tailwindcss.com/docs/backdrop-opacity",
      title: "Backdrop Opacity",
    },
    {
      url: "https://tailwindcss.com/docs/backdrop-saturate",
      title: "Backdrop Saturate",
    },
    {
      url: "https://tailwindcss.com/docs/backdrop-sepia",
      title: "Backdrop Sepia",
    },
    {
      url: "https://tailwindcss.com/docs/blur",
      title: "Blur",
    },
    {
      url: "https://tailwindcss.com/docs/brightness",
      title: "Brightness",
    },
    {
      url: "https://tailwindcss.com/docs/contrast",
      title: "Contrast",
    },
    {
      url: "https://tailwindcss.com/docs/drop-shadow",
      title: "Drop Shadow",
    },
    {
      url: "https://tailwindcss.com/docs/filter",
      title: "Filter",
    },
    {
      url: "https://tailwindcss.com/docs/grayscale",
      title: "Grayscale",
    },
    {
      url: "https://tailwindcss.com/docs/hue-rotate",
      title: "Hue Rotate",
    },
    {
      url: "https://tailwindcss.com/docs/invert",
      title: "Invert",
    },
    {
      url: "https://tailwindcss.com/docs/saturate",
      title: "Saturate",
    },
    {
      url: "https://tailwindcss.com/docs/sepia",
      title: "Sepia",
    },
  ],
  Tables: [
    {
      url: "https://tailwindcss.com/docs/border-collapse",
      title: "Border Collapse",
    },
    {
      url: "https://tailwindcss.com/docs/table-layout",
      title: "Table Layout",
    },
  ],
  "Transitions And Animation": [
    {
      url: "https://tailwindcss.com/docs/animation",
      title: "Animation",
    },
    {
      url: "https://tailwindcss.com/docs/transition-delay",
      title: "Transition Delay",
    },
    {
      url: "https://tailwindcss.com/docs/transition-duration",
      title: "Transition Duration",
    },
    {
      url: "https://tailwindcss.com/docs/transition-property",
      title: "Transition Property",
    },
    {
      url: "https://tailwindcss.com/docs/transition-timing-function",
      title: "Transition Timing Function",
    },
  ],
  Transforms: [
    {
      url: "https://tailwindcss.com/docs/rotate",
      title: "Rotate",
    },
    {
      url: "https://tailwindcss.com/docs/scale",
      title: "Scale",
    },
    {
      url: "https://tailwindcss.com/docs/skew",
      title: "Skew",
    },
    {
      url: "https://tailwindcss.com/docs/transform",
      title: "Transform",
    },
    {
      url: "https://tailwindcss.com/docs/transform-origin",
      title: "Transform Origin",
    },
    {
      url: "https://tailwindcss.com/docs/translate",
      title: "Translate",
    },
  ],
  Interactivity: [
    {
      url: "https://tailwindcss.com/docs/accent-color",
      title: "Accent Color",
    },
    {
      url: "https://tailwindcss.com/docs/appearance",
      title: "Appearance",
    },
    {
      url: "https://tailwindcss.com/docs/caret-color",
      title: "Caret Color",
    },
    {
      url: "https://tailwindcss.com/docs/cursor",
      title: "Cursor",
    },
    {
      url: "https://tailwindcss.com/docs/outline",
      title: "Outline",
    },
    {
      url: "https://tailwindcss.com/docs/pointer-events",
      title: "Pointer Events",
    },
    {
      url: "https://tailwindcss.com/docs/resize",
      title: "Resize",
    },
    {
      url: "https://tailwindcss.com/docs/scroll-behavior",
      title: "Scroll Behavior",
    },
    {
      url: "https://tailwindcss.com/docs/scroll-margin",
      title: "Scroll Margin",
    },
    {
      url: "https://tailwindcss.com/docs/scroll-padding",
      title: "Scroll Padding",
    },
    {
      url: "https://tailwindcss.com/docs/scroll-snap-align",
      title: "Scroll Snap Align",
    },
    {
      url: "https://tailwindcss.com/docs/scroll-snap-stop",
      title: "Scroll Snap Stop",
    },
    {
      url: "https://tailwindcss.com/docs/scroll-snap-type",
      title: "Scroll Snap Type",
    },
    {
      url: "https://tailwindcss.com/docs/touch-action",
      title: "Touch Action",
    },
    {
      url: "https://tailwindcss.com/docs/user-select",
      title: "User Select",
    },
    {
      url: "https://tailwindcss.com/docs/will-change",
      title: "Will Change",
    },
  ],
  SVG: [
    {
      url: "https://tailwindcss.com/docs/fill",
      title: "Fill",
    },
    {
      url: "https://tailwindcss.com/docs/stroke",
      title: "Stroke",
    },
    {
      url: "https://tailwindcss.com/docs/stroke-width",
      title: "Stroke Width",
    },
  ],
  Accessibility: [
    {
      url: "https://tailwindcss.com/docs/screen-readers",
      title: "Screen Readers",
    },
  ],
  "Official Plugins": [
    {
      url: "https://github.com/tailwindlabs/tailwindcss-aspect-ratio",
      title: "Aspect Ratio",
    },
    {
      url: "https://github.com/tailwindlabs/tailwindcss-forms",
      title: "Forms",
    },
    {
      url: "https://github.com/tailwindlabs/tailwindcss-line-clamp",
      title: "Line Clamp",
    },
    {
      url: "https://github.com/tailwindlabs/tailwindcss-typography",
      title: "Typography",
    },
  ],
};
