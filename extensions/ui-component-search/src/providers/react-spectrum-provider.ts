import { LIBRARY_URLS } from "../constants";
import { ProviderResult, UIComponent, UILibrary } from "../types";
import { fetchWithFallback } from "./provider-helpers";

/**
 * Convert a PascalCase component name like "ActionButton" to "Action Button".
 * Consecutive capitals (e.g. "DropZone") are handled so "DatePicker" -> "Date Picker".
 */
function toDisplayName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

/**
 * Fetch React Spectrum components by scraping the docs navigation.
 * Component pages live at the root as PascalCase paths, e.g.
 * https://react-spectrum.adobe.com/Accordion. The sidebar on any component
 * page links to every other component, so we parse those links.
 *
 * Fallback: on any network error, non-OK response, or unparseable markup,
 * the bundled static list is used and the result is marked as fallback.
 */
function fetchComponents(): Promise<ProviderResult> {
  return fetchWithFallback("react-spectrum", scrape, buildFallback);
}

async function scrape(): Promise<UIComponent[]> {
  const res = await fetch(`${LIBRARY_URLS.reactSpectrum.base}/Accordion`);
  if (!res.ok) {
    throw new Error(`Failed to fetch React Spectrum: ${res.statusText}`);
  }
  const html = await res.text();

  // Sidebar links look like href="https://react-spectrum.adobe.com/ActionButton"
  const linkRegex = /href="https:\/\/react-spectrum\.adobe\.com\/([A-Z][A-Za-z0-9]+)"/g;
  const names = new Set<string>();
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const name = match[1];
    if (!NON_COMPONENT_NAMES.has(name)) {
      names.add(name);
    }
  }

  if (names.size <= 20) {
    throw new Error("Could not parse component list from React Spectrum");
  }

  return Array.from(names)
    .sort()
    .map((name) => ({
      name: toDisplayName(name),
      slug: name,
      url: `${LIBRARY_URLS.reactSpectrum.base}/${name}`,
      library: "react-spectrum" as const,
    }));
}

function buildFallback(): UIComponent[] {
  return REACT_SPECTRUM_COMPONENTS.map((name) => ({
    name: toDisplayName(name),
    slug: name,
    url: `${LIBRARY_URLS.reactSpectrum.base}/${name}`,
    library: "react-spectrum" as const,
  }));
}

/** Root pages that are NOT components */
const NON_COMPONENT_NAMES = new Set(["Provider"]);

/** Comprehensive static list of React Spectrum component names */
const REACT_SPECTRUM_COMPONENTS = [
  "Accordion",
  "ActionBar",
  "ActionButton",
  "ActionButtonGroup",
  "ActionMenu",
  "Avatar",
  "AvatarGroup",
  "Badge",
  "Breadcrumbs",
  "Button",
  "ButtonGroup",
  "Calendar",
  "Card",
  "CardView",
  "Checkbox",
  "CheckboxGroup",
  "ColorArea",
  "ColorField",
  "ColorSlider",
  "ColorSwatch",
  "ColorSwatchPicker",
  "ColorWheel",
  "ComboBox",
  "ContextualHelp",
  "DateField",
  "DatePicker",
  "DateRangePicker",
  "Dialog",
  "Disclosure",
  "Divider",
  "DropZone",
  "Form",
  "IllustratedMessage",
  "Image",
  "InlineAlert",
  "LabeledValue",
  "Link",
  "LinkButton",
  "ListView",
  "Menu",
  "Meter",
  "NumberField",
  "Picker",
  "Popover",
  "ProgressBar",
  "ProgressCircle",
  "RadioGroup",
  "RangeCalendar",
  "RangeSlider",
  "SearchField",
  "SegmentedControl",
  "SelectBoxGroup",
  "SideNav",
  "Skeleton",
  "Slider",
  "StatusLight",
  "Switch",
  "TableView",
  "Tabs",
  "TagGroup",
  "TextArea",
  "TextField",
  "TimeField",
  "Toast",
  "ToggleButton",
  "ToggleButtonGroup",
  "Tooltip",
  "TreeView",
].sort();

export const reactSpectrumLibrary: UILibrary = {
  id: "react-spectrum",
  name: "React Spectrum",
  icon: "react-spectrum-icon.png",
  baseUrl: LIBRARY_URLS.reactSpectrum.base,
  fetchComponents,
};
