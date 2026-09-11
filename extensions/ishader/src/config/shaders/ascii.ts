import { ShaderParameter, ShaderConfig } from "../types";
import { COMMON_PARAMETERS } from "../common";

// ASCII shader configuration
export const ASCII_PARAMETERS: ShaderParameter[] = [
  // Effect-specific parameters (order 0-99)
  {
    id: "charSize",
    label: "Character Size",
    type: "int",
    default: 8,
    min: 4,
    max: 32,
    step: 2,
    shortcut: { modifiers: [], key: "2" },
    decrementShortcut: { modifiers: [], key: "1" },
    category: "effect",
    metadata: true,
    order: 1,
  },
  {
    id: "characterSet",
    label: "Character Set",
    type: "string",
    default: " .:-=+*#%@",
    category: "effect",
    metadata: true,
    order: 2,
  },
  {
    id: "colorMode",
    label: "Color Mode",
    type: "bool",
    default: false,
    shortcut: { modifiers: [], key: "c" },
    category: "effect",
    metadata: true,
    order: 3,
  },
  {
    id: "monoMode",
    label: "Mono Mode",
    type: "enum",
    default: "grayscale",
    options: [
      { value: "grayscale", label: "B/W (Grayscale)" },
      { value: "mono-r", label: "Red Channel" },
      { value: "mono-g", label: "Green Channel" },
      { value: "mono-b", label: "Blue Channel" },
      { value: "mono-y", label: "Yellow (R+G)" },
      { value: "mono-c", label: "Cyan (G+B)" },
      { value: "mono-m", label: "Magenta (R+B)" },
    ],
    shortcut: { modifiers: [], key: "m" },
    category: "effect",
    metadata: true,
    order: 3.5,
  },
  {
    id: "whiteEffect",
    label: "White Effect",
    type: "bool",
    default: false,
    shortcut: { modifiers: [], key: "u" },
    category: "effect",
    metadata: true,
    order: 3.7,
  },
  {
    id: "hue",
    label: "Hue",
    type: "float",
    default: 0,
    min: -180,
    max: 180,
    step: 15,
    shortcut: { modifiers: [], key: "k" },
    decrementShortcut: { modifiers: [], key: "j" },
    category: "effect",
    metadata: true,
    order: 4,
  },
  // Common parameters come last
  ...COMMON_PARAMETERS,
];

export const ASCII_CONFIG: ShaderConfig = {
  id: "ascii",
  name: "ASCII",
  description: "ASCII art conversion",
  glslFile: "assets/shaders/ascii.glsl",
  processor: "processImageWithAscii",
  parameters: ASCII_PARAMETERS,
};
