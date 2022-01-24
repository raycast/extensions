import { ActionPanel, Icon, List, OpenInBrowserAction } from "@raycast/api";
import { v4 } from "uuid";

const items = [
  {
    id: v4(),
    title: "Aspect Ratio",
    url: "https://chakra-ui.com/docs/layout/aspect-ratio",
  },
  {
    id: v4(),
    title: "Box",
    url: "https://chakra-ui.com/docs/layout/box",
  },
  {
    id: v4(),
    title: "Center",
    url: "https://chakra-ui.com/docs/layout/center",
  },
  {
    id: v4(),
    title: "Container",
    url: "https://chakra-ui.com/docs/layout/container",
  },
  {
    id: v4(),
    title: "Flex",
    url: "https://chakra-ui.com/docs/layout/flex",
  },
  {
    id: v4(),
    title: "Grid",
    url: "https://chakra-ui.com/docs/layout/grid",
  },
  {
    id: v4(),
    title: "Simple Grid",
    url: "https://chakra-ui.com/docs/layout/simple-grid",
  },
  {
    id: v4(),
    title: "Stack",
    url: "https://chakra-ui.com/docs/layout/stack",
  },
  {
    id: v4(),
    title: "Wrap",
    url: "https://chakra-ui.com/docs/layout/wrap",
  },
  {
    id: v4(),
    title: "Button",
    url: "https://chakra-ui.com/docs/form/button",
  },
  {
    id: v4(),
    title: "Checkbox",
    url: "https://chakra-ui.com/docs/form/checkbox",
  },
  {
    id: v4(),
    title: "Editable",
    url: "https://chakra-ui.com/docs/form/editable",
  },
  {
    id: v4(),
    title: "Form Control",
    url: "https://chakra-ui.com/docs/form/form-control",
  },
  {
    id: v4(),
    title: "Icon Button",
    url: "https://chakra-ui.com/docs/form/icon-button",
  },
  {
    id: v4(),
    title: "Input",
    url: "https://chakra-ui.com/docs/form/input",
  },
  {
    id: v4(),
    title: "Number Input",
    url: "https://chakra-ui.com/docs/form/number-input",
  },
  {
    id: v4(),
    title: "Pin Input",
    url: "https://chakra-ui.com/docs/form/pin-input",
  },
  {
    id: v4(),
    title: "Radio",
    url: "https://chakra-ui.com/docs/form/radio",
  },
  {
    id: v4(),
    title: "Range Slider",
    url: "https://chakra-ui.com/docs/form/range-slider",
  },
  {
    id: v4(),
    title: "Select",
    url: "https://chakra-ui.com/docs/form/select",
  },
  {
    id: v4(),
    title: "Slider",
    url: "https://chakra-ui.com/docs/form/slider",
  },
  {
    id: v4(),
    title: "Switch",
    url: "https://chakra-ui.com/docs/form/switch",
  },
  {
    id: v4(),
    title: "Textarea",
    url: "https://chakra-ui.com/docs/form/textarea",
  },
  {
    id: v4(),
    title: "Badge",
    url: "https://chakra-ui.com/docs/data-display/badge",
  },
  {
    id: v4(),
    title: "Close Button",
    url: "https://chakra-ui.com/docs/components/close-button",
  },
  {
    id: v4(),
    title: "Code",
    url: "https://chakra-ui.com/docs/data-display/code",
  },
  {
    id: v4(),
    title: "Divider",
    url: "https://chakra-ui.com/docs/data-display/divider",
  },
  {
    id: v4(),
    title: "Kbd",
    url: "https://chakra-ui.com/docs/data-display/kbd",
  },
  {
    id: v4(),
    title: "List",
    url: "https://chakra-ui.com/docs/data-display/list",
  },
  {
    id: v4(),
    title: "Stat",
    url: "https://chakra-ui.com/docs/data-display/stat",
  },
  {
    id: v4(),
    title: "Table",
    url: "https://chakra-ui.com/docs/data-display/table",
  },
  {
    id: v4(),
    title: "Tag",
    url: "https://chakra-ui.com/docs/data-display/tag",
  },
  {
    id: v4(),
    title: "Alert",
    url: "https://chakra-ui.com/docs/feedback/alert",
  },
  {
    id: v4(),
    title: "Circular Progress",
    url: "https://chakra-ui.com/docs/feedback/circular-progress",
  },
  {
    id: v4(),
    title: "Progress",
    url: "https://chakra-ui.com/docs/feedback/progress",
  },
  {
    id: v4(),
    title: "Skeleton",
    url: "https://chakra-ui.com/docs/feedback/skeleton",
  },
  {
    id: v4(),
    title: "Spinner",
    url: "https://chakra-ui.com/docs/feedback/spinner",
  },
  {
    id: v4(),
    title: "Toast",
    url: "https://chakra-ui.com/docs/feedback/toast",
  },
  {
    id: v4(),
    title: "Text",
    url: "https://chakra-ui.com/docs/typography/text",
  },
  {
    id: v4(),
    title: "Heading",
    url: "https://chakra-ui.com/docs/typography/heading",
  },
  {
    id: v4(),
    title: "Alert Dialog",
    url: "https://chakra-ui.com/docs/overlay/alert-dialog",
  },
  {
    id: v4(),
    title: "Drawer",
    url: "https://chakra-ui.com/docs/overlay/drawer",
  },
  {
    id: v4(),
    title: "Menu",
    url: "https://chakra-ui.com/docs/overlay/menu",
  },
  {
    id: v4(),
    title: "Modal",
    url: "https://chakra-ui.com/docs/overlay/modal",
  },
  {
    id: v4(),
    title: "Popover",
    url: "https://chakra-ui.com/docs/overlay/popover",
  },
  {
    id: v4(),
    title: "Tooltip",
    url: "https://chakra-ui.com/docs/overlay/tooltip",
  },
  {
    id: v4(),
    title: "Accordion",
    url: "https://chakra-ui.com/docs/disclosure/accordion",
  },
  {
    id: v4(),
    title: "Tabs",
    url: "https://chakra-ui.com/docs/disclosure/tabs",
  },
  {
    id: v4(),
    title: "Visually Hidden",
    url: "https://chakra-ui.com/docs/disclosure/visually-hidden",
  },
  {
    id: v4(),
    title: "Breadcrumb",
    url: "https://chakra-ui.com/docs/navigation/breadcrumb",
  },
  {
    id: v4(),
    title: "Link",
    url: "https://chakra-ui.com/docs/navigation/link",
  },
  {
    id: v4(),
    title: "Link Overlay",
    url: "https://chakra-ui.com/docs/navigation/link-overlay",
  },
  {
    id: v4(),
    title: "Avatar",
    url: "https://chakra-ui.com/docs/media-and-icons/avatar",
  },
  {
    id: v4(),
    title: "Icon",
    url: "https://chakra-ui.com/docs/media-and-icons/icon",
  },
  {
    id: v4(),
    title: "Image",
    url: "https://chakra-ui.com/docs/media-and-icons/image",
  },
  {
    id: v4(),
    title: "Portal",
    url: "https://chakra-ui.com/docs/components/portal",
  },
  {
    id: v4(),
    title: "Transitions",
    url: "https://chakra-ui.com/docs/components/transitions",
  },
  {
    id: v4(),
    title: "useBoolean",
    url: "https://chakra-ui.com/docs/hooks/use-boolean",
  },
  {
    id: v4(),
    title: "useBreakpointValue",
    url: "https://chakra-ui.com/docs/hooks/use-breakpoint-value",
  },
  {
    id: v4(),
    title: "useClipboard",
    url: "https://chakra-ui.com/docs/hooks/use-clipboard",
  },
  {
    id: v4(),
    title: "useConst",
    url: "https://chakra-ui.com/docs/hooks/use-const",
  },
  {
    id: v4(),
    title: "useControllable",
    url: "https://chakra-ui.com/docs/hooks/use-controllable",
  },
  {
    id: v4(),
    title: "useDisclosure",
    url: "https://chakra-ui.com/docs/hooks/use-disclosure",
  },
  {
    id: v4(),
    title: "useMediaQuery",
    url: "https://chakra-ui.com/docs/hooks/use-media-query",
  },
  {
    id: v4(),
    title: "useMergeRefs",
    url: "https://chakra-ui.com/docs/hooks/use-merge-refs",
  },
  {
    id: v4(),
    title: "useOutsideClick",
    url: "https://chakra-ui.com/docs/hooks/use-outside-click",
  },
  {
    id: v4(),
    title: "usePrefersReducedMotion",
    url: "https://chakra-ui.com/docs/hooks/use-prefers-reduced-motion",
  },
  {
    id: v4(),
    title: "useTheme",
    url: "https://chakra-ui.com/docs/hooks/use-theme",
  },
  {
    id: v4(),
    title: "useToken",
    url: "https://chakra-ui.com/docs/hooks/use-token",
  },
];

export default function Command() {
  return (
    <List isLoading={false} searchBarPlaceholder="Filter by title...">
      {items.map((item) => (
        <List.Item
          key={item.id}
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
