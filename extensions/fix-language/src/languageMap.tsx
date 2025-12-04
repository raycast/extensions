import thaiLayout from "simple-keyboard-layouts/build/layouts/thai";
import englishLayout from "simple-keyboard-layouts/build/layouts/english";

const layoutTH: ILayout = {
  default: thaiLayout.layout.default,
  shift: thaiLayout.layout.shift,
};

const layoutEN: ILayout = {
  default: englishLayout.layout.default,
  shift: englishLayout.layout.shift,
};

export type ILayout = {
  default: string[];
  shift: string[];
};

const languageMap: { [key: string]: ILayout } = {
  th: layoutTH,
  en: layoutEN,
};

// Function to create a mapping
export function createMapping(layout1: ILayout, layout2: ILayout): Record<string, string> {
  const mapping: Record<string, string> = {};

  // Combine default and shift layouts
  const layout1Keys = [...layout1.default.join(" ").split(" "), ...layout1.shift.join(" ").split(" ")];
  const layout2Keys = [...layout2.default.join(" ").split(" "), ...layout2.shift.join(" ").split(" ")];

  // Create mapping between corresponding keys
  for (let i = 0; i < layout1Keys.length; i++) {
    if (!layout1Keys[i].includes("{") && !layout2Keys[i].includes("{")) {
      // Ignore special keys like {bksp}
      mapping[layout2Keys[i]] = layout1Keys[i];
    }
  }

  return mapping;
}

export default languageMap;
