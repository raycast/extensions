import fetch from "node-fetch";
import { LIBRARY_URLS } from "../constants";
import { UIComponent, UILibrary } from "../types";
import { getCached, setCache } from "../utils/cache";

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
 * Fallback: if scraping fails, use a comprehensive static list.
 */
async function fetchComponents(): Promise<UIComponent[]> {
  const cached = getCached("react-spectrum");
  if (cached) return cached;

  let components: UIComponent[] | null = null;

  try {
    const res = await fetch(`${LIBRARY_URLS.reactSpectrum.base}/Accordion`);
    if (res.ok) {
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

      if (names.size > 20) {
        components = Array.from(names)
          .sort()
          .map((name) => ({
            name: toDisplayName(name),
            slug: name,
            url: `${LIBRARY_URLS.reactSpectrum.base}/${name}`,
            library: "react-spectrum" as const,
          }));
      }
    }
  } catch {
    // Scraping failed, fall through to static list
  }

  // Fallback to static list if scraping didn't yield enough results
  if (!components || components.length === 0) {
    components = REACT_SPECTRUM_COMPONENTS.map((name) => ({
      name: toDisplayName(name),
      slug: name,
      url: `${LIBRARY_URLS.reactSpectrum.base}/${name}`,
      library: "react-spectrum" as const,
    }));
  }

  setCache("react-spectrum", components);
  return components;
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
