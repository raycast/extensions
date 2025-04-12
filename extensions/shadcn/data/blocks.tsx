import { managerType } from "../src/set-install";
import * as example from "./examples"

type blockType = {
	name: string
	description: string
	setup?: boolean
	component: string
	url: string
	docs?: string
	api?: string,
	example?: string
}

export const getInstallCommand = (manager: managerType | undefined, component: string): string => {
	switch (manager) {
		case "npm":
			return `npx shadcn@latest add ${component}`;
		case "pnpm":
			return `pnpm dlx shadcn@latest add ${component}`;
		case "yarn":
			return `npx shadcn@latest add ${component}`;
		case "bun":
			return `bunx --bun shadcn@latest add ${component}`;
		default:
			return `npx shadcn@latest add ${component}`;
	}
};

export const getBlocks = (): blockType[] => [
	{
		name: "Accordion",
		description: "A vertically stacked set of interactive headings that each reveal a section of content.",
		component: "accordion",
		url: "https://ui.shadcn.com/docs/components/alert",
		docs: "https://www.radix-ui.com/docs/primitives/components/accordion",
		api: "https://www.radix-ui.com/docs/primitives/components/accordion#api-reference",
		example: example.Accordion()
	},
	{
		name: "Alert",
		description: "Displays a callout for user attention.",
		component: "alert",
		url: "https://ui.shadcn.com/docs/components/accordion",
		example: example.Alert()
	},
	{
		name: "Alert Dialog",
		description: "A modal dialog that interrupts the user with important content and expects a response.",
		component: "alert-dialog",
		url: "https://ui.shadcn.com/docs/components/alert-dialog",
		docs: "https://www.radix-ui.com/docs/primitives/components/alert-dialog",
		api: "https://www.radix-ui.com/docs/primitives/components/alert-dialog#api-reference",
		example: example.AlertDialog()
	},
	{
		name: "Aspect Ratio",
		description: "A modal dialog that interrupts the user with important content and expects a response.",
		component: "aspect-ratio",
		url: "https://ui.shadcn.com/docs/components/aspect-ratio",
		docs: "https://www.radix-ui.com/docs/primitives/components/aspect-ratio",
		api: "https://www.radix-ui.com/docs/primitives/components/aspect-ratio#api-reference",
		example: example.AspectRatio()
	},
	{
		name: "Avatar",
		description: "An image element with a fallback for representing the user.",
		component: "avatar",
		url: "https://ui.shadcn.com/docs/components/avatar",
		docs: "https://www.radix-ui.com/docs/primitives/components/avatar",
		api: "https://www.radix-ui.com/docs/primitives/components/avatar#api-reference",
		example: example.Avatar()
	},
	{
		name: "Badge",
		description: "Displays a badge or a component that looks like a badge.",
		component: "badge",
		url: "https://ui.shadcn.com/docs/components/badge",
		example: example.Badge()
	},
	{
		name: "Breadcrumb",
		description: "Displays the path to the current resource using a hierarchy of links.",
		component: "breadcrumb",
		url: "https://ui.shadcn.com/docs/components/breadcrumb",
		example: example.Breadcrumb()
	},
	{
		name: "Button",
		description: "Displays a button or a component that looks like a button.",
		component: "button",
		url: "https://ui.shadcn.com/docs/components/button",
		example: example.Button()
	},
	{
		name: "Calendar",
		description: "A date field component that allows users to enter and edit date.",
		component: "calendar",
		url: "https://ui.shadcn.com/docs/components/calendar",
		docs: "https://react-day-picker.js.org/",
		example: example.Calendar()
	},
	{
		name: "Card",
		description: "Displays a card with header, content, and footer.",
		component: "card",
		url: "https://ui.shadcn.com/docs/components/card",
		example: example.Card()
	},
	{
		name: "Carousel",
		description: "A carousel with motion and swipe built using Embla.",
		component: "carousel",
		url: "https://ui.shadcn.com/docs/components/carousel",
		docs: "https://www.embla-carousel.com/get-started/react",
		api: "https://www.embla-carousel.com/api",
		example: example.Carousel()
	},
	{
		name: "Chart",
		description: "Beautiful charts. Built using Recharts. Copy and paste into your apps.",
		component: "chart",
		url: "https://ui.shadcn.com/docs/components/chart",
	},
	{
		name: "Checkbox",
		description: "A control that allows the user to toggle between checked and not checked.",
		component: "checkbox",
		url: "https://ui.shadcn.com/docs/components/checkbox",
		docs: "https://www.radix-ui.com/docs/primitives/components/checkbox",
		api: "https://www.radix-ui.com/docs/primitives/components/checkbox#api-reference",
		example: example.Checkbox()
	},
	{
		name: "Collapsible",
		description: "An interactive component which expands/collapses a panel.",
		component: "collapsible",
		url: "https://ui.shadcn.com/docs/components/collapsible",
		docs: "https://www.radix-ui.com/docs/primitives/components/collapsible",
		api: "https://www.radix-ui.com/docs/primitives/components/collapsible#api-reference",
		example: example.Collapsible()
	},
	{
		name: "Combobox",
		description: "Autocomplete input and command palette with a list of suggestions.",
		setup: true,
		component: "popover command",
		url: "https://ui.shadcn.com/docs/components/combobox",
		example: example.Combobox()
	},
	{
		name: "Command",
		description: "Fast, composable, unstyled command menu for React.",
		component: "command",
		url: "https://ui.shadcn.com/docs/components/command",
		docs: "https://cmdk.paco.me/",
		example: example.Command()
	},
	{
		name: "Context Menu",
		description: "Displays a menu to the user — triggered by a button.",
		component: "context-menu",
		url: "https://ui.shadcn.com/docs/components/context-menu",
		docs: "https://www.radix-ui.com/docs/primitives/components/context-menu",
		api: "https://www.radix-ui.com/docs/primitives/components/context-menu#api-reference",
		example: example.ContextMenu()
	},
	{
		name: "Data Table",
		description: "Powerful table and datagrids built using TanStack Table.",
		setup: true,
		component: "table",
		url: "https://ui.shadcn.com/docs/components/table",
		docs: "https://tanstack.com/table/v8/docs/introduction",
		example: example.DataTable()
	},
	{
		name: "Date Picker",
		description: "A date picker component with range and presets.",
		setup: true,
		component: "popover calendar",
		url: "https://ui.shadcn.com/docs/components/date-picker",
		example: example.DatePicker()
	},
	{
		name: "Dialog",
		description: "A window overlaid on either the primary window or another dialog window.",
		component: "dialog",
		url: "https://ui.shadcn.com/docs/components/dialog",
		docs: "https://www.radix-ui.com/docs/primitives/components/dialog",
		api: "https://www.radix-ui.com/docs/primitives/components/dialog#api-reference",
		example: example.Dialog()
	},
	{
		name: "Drawer",
		description: "A drawer component for React.",
		component: "drawer",
		url: "https://ui.shadcn.com/docs/components/drawer",
		docs: "https://vaul.emilkowal.ski/getting-started",
		example: example.Drawer()
	},
	{
		name: "Dropdown Menu",
		description: "Displays a menu to the user — such as a set of actions or functions — triggered by a button.",
		component: "dropdown-menu",
		url: "https://ui.shadcn.com/docs/components/dropdown-menu",
		docs: "https://www.radix-ui.com/docs/primitives/components/dropdown-menu",
		api: "https://www.radix-ui.com/docs/primitives/components/dropdown-menu#api-reference",
		example: example.DropdownMenu()
	},
	{
		name: "Form",
		description: "Building forms with React Hook Form and Zod.",
		component: "form",
		url: "https://ui.shadcn.com/docs/components/form",
		docs: "https://react-hook-form.com/"
	},
	{
		name: "Hover Card",
		description: "For sighted users to preview content available behind a link.",
		component: "hover-card",
		url: "https://ui.shadcn.com/docs/components/hover-card",
		docs: "https://www.radix-ui.com/docs/primitives/components/hover-card",
		api: "https://www.radix-ui.com/docs/primitives/components/hover-card#api-reference",
		example: example.HoverCard()
	},
	{
		name: "Input",
		description: "Displays a form input field or a component that looks like an input field.",
		component: "input",
		url: "https://ui.shadcn.com/docs/components/input",
		example: example.Input()
	},
	{
		name: "Input OTP",
		description: "Accessible one-time password component with copy paste functionality.",
		component: "input-otp",
		url: "https://ui.shadcn.com/docs/components/input-otp",
		docs: "https://input-otp.rodz.dev/",
		example: example.InputOTP()
	},
	{
		name: "Label",
		description: "Renders an accessible label associated with controls.",
		component: "label",
		url: "https://ui.shadcn.com/docs/components/label",
		docs: "https://www.radix-ui.com/docs/primitives/components/label",
		api: "https://www.radix-ui.com/docs/primitives/components/label#api-reference",
		example: example.Label()
	},
	{
		name: "Menubar",
		description: "A visually persistent menu common in desktop applications that provides quick access to a consistent set of commands.",
		component: "menubar",
		url: "https://ui.shadcn.com/docs/components/menubar",
		docs: "https://www.radix-ui.com/docs/primitives/components/menubar",
		api: "https://www.radix-ui.com/docs/primitives/components/menubar#api-reference",
		example: example.MenuBar()
	},
	{
		name: "Navigation Menu",
		description: "A collection of links for navigating websites.",
		component: "navigation-menu",
		url: "https://ui.shadcn.com/docs/components/navigation-menu",
		docs: "https://www.radix-ui.com/docs/primitives/components/navigation-menu",
		api: "https://www.radix-ui.com/docs/primitives/components/navigation-menu#api-reference",
		example: example.NavigationMenu()
	},
	{
		name: "Pagination",
		description: "Pagination with page navigation, next and previous links.",
		component: "pagination",
		url: "https://ui.shadcn.com/docs/components/pagination",
		example: example.Pagination()
	},
	{
		name: "Popover",
		description: "Displays rich content in a portal, triggered by a button.",
		component: "popover",
		url: "https://ui.shadcn.com/docs/components/popover",
		docs: "https://www.radix-ui.com/docs/primitives/components/popover",
		api: "https://www.radix-ui.com/docs/primitives/components/popover#api-reference",
		example: example.Popover()
	},
	{
		name: "Progress",
		description: "Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.",
		component: "progress",
		url: "https://ui.shadcn.com/docs/components/progress",
		docs: "https://www.radix-ui.com/docs/primitives/components/progress",
		api: "https://www.radix-ui.com/docs/primitives/components/progress#api-reference",
		example: example.Progress()
	},
	{
		name: "Radio Group",
		description: "A set of checkable buttons—known as radio buttons—where no more than one of the buttons can be checked at a time.",
		component: "radio-group",
		url: "https://ui.shadcn.com/docs/components/radio-group",
		docs: "https://www.radix-ui.com/docs/primitives/components/radio-group",
		api: "https://www.radix-ui.com/docs/primitives/components/radio-group#api-reference",
		example: example.RadioGroup()
	},
	{
		name: "Resizable",
		description: "Accessible resizable panel groups and layouts with keyboard support.",
		component: "resizable",
		url: "https://ui.shadcn.com/docs/components/resizable",
		docs: "https://github.com/bvaughn/react-resizable-panels",
		api: "https://github.com/bvaughn/react-resizable-panels/tree/main/packages/react-resizable-panels",
		example: example.Resizable()
	},
	{
		name: "Scroll-area",
		description: "Augments native scroll functionality for custom, cross-browser styling.",
		component: "scroll-area",
		url: "https://ui.shadcn.com/docs/components/scroll-area",
		docs: "https://www.radix-ui.com/docs/primitives/components/scroll-area",
		api: "https://www.radix-ui.com/docs/primitives/components/scroll-area#api-reference",
	},
	{
		name: "Select",
		description: "Displays a list of options for the user to pick from—triggered by a button.",
		component: "select",
		url: "https://ui.shadcn.com/docs/components/select",
		docs: "https://www.radix-ui.com/docs/primitives/components/select",
		api: "https://www.radix-ui.com/docs/primitives/components/select#api-reference",
		example: example.Select()
	},
	{
		name: "Separator",
		description: "Visually or semantically separates content.",
		component: "separator",
		url: "https://ui.shadcn.com/docs/components/separator",
		docs: "https://www.radix-ui.com/docs/primitives/components/separator",
		api: "https://www.radix-ui.com/docs/primitives/components/separator#api-reference",
		example: example.Seperator()
	},
	{
		name: "Sheet",
		description: "Extends the Dialog component to display content that complements the main content of the screen.",
		component: "sheet",
		url: "https://ui.shadcn.com/docs/components/sheet",
		docs: "https://www.radix-ui.com/docs/primitives/components/dialog",
		api: "https://www.radix-ui.com/docs/primitives/components/dialog#api-reference",
		example: example.Sheet()
	},
	{
		name: "Sidebar",
		description: "A composable, themeable and customizable sidebar component.",
		component: "sidebar",
		setup: true,
		url: "https://ui.shadcn.com/docs/components/sidebar",
	},
	{
		name: "Skeleton",
		description: "Use to show a placeholder while content is loading.",
		component: "skeleton",
		url: "https://ui.shadcn.com/docs/components/skeleton",
		example: example.Skeleton()
	},
	{
		name: "Slider",
		description: "An input where the user selects a value from within a given range.",
		component: "slider",
		url: "https://ui.shadcn.com/docs/components/slider",
		docs: "https://www.radix-ui.com/docs/primitives/components/slider",
		api: "https://www.radix-ui.com/docs/primitives/components/slider#api-reference",
		example: example.Slider()
	},
	{
		name: "Sonner",
		description: "An opinionated toast component for React.",
		component: "sonner",
		setup: true,
		url: "https://ui.shadcn.com/docs/components/sonner",
		docs: "https://sonner.emilkowal.ski/",
	},
	{
		name: "Switch",
		description: "A control that allows the user to toggle between checked and not checked.",
		component: "switch",
		url: "https://ui.shadcn.com/docs/components/switch",
		docs: "https://www.radix-ui.com/docs/primitives/components/switch",
		api: "https://www.radix-ui.com/docs/primitives/components/switch#api-reference",
		example: example.Switch()
	},
	{
		name: "Table",
		description: "A responsive table component.",
		component: "table",
		url: "https://ui.shadcn.com/docs/components/table",
		example: example.Table()
	},
	{
		name: "Tabs",
		description: "A set of layered sections of content—known as tab panels—that are displayed one at a time.",
		component: "tabs",
		url: "https://ui.shadcn.com/docs/components/tabs",
		docs: "https://www.radix-ui.com/docs/primitives/components/tabs",
		api: "https://www.radix-ui.com/docs/primitives/components/tabs#api-reference",
		example: example.Tabs()
	},
	{
		name: "Textarea",
		description: "Displays a form textarea or a component that looks like a textarea.",
		component: "textarea",
		url: "https://ui.shadcn.com/docs/components/textarea",
		example: example.TextArea()
	},
	{
		name: "Toggle",
		description: "A two-state button that can be either on or off.",
		component: "toggle",
		url: "https://ui.shadcn.com/docs/components/toggle",
		docs: "https://www.radix-ui.com/docs/primitives/components/toggle",
		api: "https://www.radix-ui.com/docs/primitives/components/toggle#api-reference",
		example: example.Toggle()
	},
	{
		name: "Toggle Group",
		description: "A set of two-state buttons that can be toggled on or off.",
		component: "toggle-group",
		url: "https://ui.shadcn.com/docs/components/toggle-group",
		docs: "https://www.radix-ui.com/docs/primitives/components/toggle-group",
		api: "https://www.radix-ui.com/docs/primitives/components/toggle-group#api-reference",
		example: example.ToggleGroup()
	},
	{
		name: "Tooltip",
		description: "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.",
		component: "tooltip",
		url: "https://ui.shadcn.com/docs/components/tooltip",
		docs: "https://www.radix-ui.com/docs/primitives/components/tooltip",
		api: "https://www.radix-ui.com/docs/primitives/components/tooltip#api-reference",
		example: example.Tooltip()
	}
]