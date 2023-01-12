import { ActionPanel, Icon, List, OpenInBrowserAction } from "@raycast/api";

const items = [
  {
    title: "Aspect Ratio",
    url: "https://chakra-ui.com/docs/layout/aspect-ratio",
  },
  {
    title: "Box",
    url: "https://chakra-ui.com/docs/layout/box",
  },
  {
    title: "Center",
    url: "https://chakra-ui.com/docs/layout/center",
  },
  {
    title: "Container",
    url: "https://chakra-ui.com/docs/layout/container",
  },
  {
    title: "Flex",
    url: "https://chakra-ui.com/docs/layout/flex",
  },
  {
    title: "Grid",
    url: "https://chakra-ui.com/docs/layout/grid",
  },
  {
    title: "Simple Grid",
    url: "https://chakra-ui.com/docs/layout/simple-grid",
  },
  {
    title: "Stack",
    url: "https://chakra-ui.com/docs/layout/stack",
  },
  {
    title: "Wrap",
    url: "https://chakra-ui.com/docs/layout/wrap",
  },
  {
    title: "Button",
    url: "https://chakra-ui.com/docs/form/button",
  },
  {
    title: "Checkbox",
    url: "https://chakra-ui.com/docs/form/checkbox",
  },
  {
    title: "Editable",
    url: "https://chakra-ui.com/docs/form/editable",
  },
  {
    title: "Form Control",
    url: "https://chakra-ui.com/docs/form/form-control",
  },
  {
    title: "Icon Button",
    url: "https://chakra-ui.com/docs/form/icon-button",
  },
  {
    title: "Input",
    url: "https://chakra-ui.com/docs/form/input",
  },
  {
    title: "Number Input",
    url: "https://chakra-ui.com/docs/form/number-input",
  },
  {
    title: "Pin Input",
    url: "https://chakra-ui.com/docs/form/pin-input",
  },
  {
    title: "Radio",
    url: "https://chakra-ui.com/docs/form/radio",
  },
  {
    title: "Range Slider",
    url: "https://chakra-ui.com/docs/form/range-slider",
  },
  {
    title: "Select",
    url: "https://chakra-ui.com/docs/form/select",
  },
  {
    title: "Slider",
    url: "https://chakra-ui.com/docs/form/slider",
  },
  {
    title: "Switch",
    url: "https://chakra-ui.com/docs/form/switch",
  },
  {
    title: "Textarea",
    url: "https://chakra-ui.com/docs/form/textarea",
  },
  {
    title: "Badge",
    url: "https://chakra-ui.com/docs/data-display/badge",
  },
  {
    title: "Close Button",
    url: "https://chakra-ui.com/docs/components/close-button",
  },
  {
    title: "Code",
    url: "https://chakra-ui.com/docs/data-display/code",
  },
  {
    title: "Divider",
    url: "https://chakra-ui.com/docs/data-display/divider",
  },
  {
    title: "Kbd",
    url: "https://chakra-ui.com/docs/data-display/kbd",
  },
  {
    title: "List",
    url: "https://chakra-ui.com/docs/data-display/list",
  },
  {
    title: "Stat",
    url: "https://chakra-ui.com/docs/data-display/stat",
  },
  {
    title: "Table",
    url: "https://chakra-ui.com/docs/data-display/table",
  },
  {
    title: "Tag",
    url: "https://chakra-ui.com/docs/data-display/tag",
  },
  {
    title: "Alert",
    url: "https://chakra-ui.com/docs/feedback/alert",
  },
  {
    title: "Circular Progress",
    url: "https://chakra-ui.com/docs/feedback/circular-progress",
  },
  {
    title: "Progress",
    url: "https://chakra-ui.com/docs/feedback/progress",
  },
  {
    title: "Skeleton",
    url: "https://chakra-ui.com/docs/feedback/skeleton",
  },
  {
    title: "Spinner",
    url: "https://chakra-ui.com/docs/feedback/spinner",
  },
  {
    title: "Toast",
    url: "https://chakra-ui.com/docs/feedback/toast",
  },
  {
    title: "Text",
    url: "https://chakra-ui.com/docs/typography/text",
  },
  {
    title: "Heading",
    url: "https://chakra-ui.com/docs/typography/heading",
  },
  {
    title: "Alert Dialog",
    url: "https://chakra-ui.com/docs/overlay/alert-dialog",
  },
  {
    title: "Drawer",
    url: "https://chakra-ui.com/docs/overlay/drawer",
  },
  {
    title: "Menu",
    url: "https://chakra-ui.com/docs/overlay/menu",
  },
  {
    title: "Modal",
    url: "https://chakra-ui.com/docs/overlay/modal",
  },
  {
    title: "Popover",
    url: "https://chakra-ui.com/docs/overlay/popover",
  },
  {
    title: "Tooltip",
    url: "https://chakra-ui.com/docs/overlay/tooltip",
  },
  {
    title: "Accordion",
    url: "https://chakra-ui.com/docs/disclosure/accordion",
  },
  {
    title: "Tabs",
    url: "https://chakra-ui.com/docs/disclosure/tabs",
  },
  {
    title: "Visually Hidden",
    url: "https://chakra-ui.com/docs/disclosure/visually-hidden",
  },
  {
    title: "Breadcrumb",
    url: "https://chakra-ui.com/docs/navigation/breadcrumb",
  },
  {
    title: "Link",
    url: "https://chakra-ui.com/docs/navigation/link",
  },
  {
    title: "Link Overlay",
    url: "https://chakra-ui.com/docs/navigation/link-overlay",
  },
  {
    title: "Avatar",
    url: "https://chakra-ui.com/docs/media-and-icons/avatar",
  },
  {
    title: "Icon",
    url: "https://chakra-ui.com/docs/media-and-icons/icon",
  },
  {
    title: "Image",
    url: "https://chakra-ui.com/docs/media-and-icons/image",
  },
  {
    title: "Portal",
    url: "https://chakra-ui.com/docs/components/portal",
  },
  {
    title: "Transitions",
    url: "https://chakra-ui.com/docs/components/transitions",
  },
  {
    title: "useBoolean",
    url: "https://chakra-ui.com/docs/hooks/use-boolean",
  },
  {
    title: "useBreakpointValue",
    url: "https://chakra-ui.com/docs/hooks/use-breakpoint-value",
  },
  {
    title: "useClipboard",
    url: "https://chakra-ui.com/docs/hooks/use-clipboard",
  },
  {
    title: "useConst",
    url: "https://chakra-ui.com/docs/hooks/use-const",
  },
  {
    title: "useControllable",
    url: "https://chakra-ui.com/docs/hooks/use-controllable",
  },
  {
    title: "useDisclosure",
    url: "https://chakra-ui.com/docs/hooks/use-disclosure",
  },
  {
    title: "useMediaQuery",
    url: "https://chakra-ui.com/docs/hooks/use-media-query",
  },
  {
    title: "useMergeRefs",
    url: "https://chakra-ui.com/docs/hooks/use-merge-refs",
  },
  {
    title: "useOutsideClick",
    url: "https://chakra-ui.com/docs/hooks/use-outside-click",
  },
  {
    title: "usePrefersReducedMotion",
    url: "https://chakra-ui.com/docs/hooks/use-prefers-reduced-motion",
  },
  {
    title: "useTheme",
    url: "https://chakra-ui.com/docs/hooks/use-theme",
  },
  {
    title: "useToken",
    url: "https://chakra-ui.com/docs/hooks/use-token",
  },
];

export default function Command() {
  return (
    <List isLoading={false} searchBarPlaceholder="Filter by title...">
      {items.map((item) => (
        <List.Item
          key={item.title}
          icon={{ source: Icon.Link }}
          title={item.title}
          actions={
            <ActionPanel>
              <OpenInBrowserAction url={item.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
