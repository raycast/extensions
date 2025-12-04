import { Icon } from "@raycast/api";
import { Color, Format } from "./interfaces";

export const COLORS: Color[] = [
  { name: "Black", chatCode: "0", hexCode: "#000000" },
  { name: "Dark Blue", chatCode: "1", hexCode: "#0000AA" },
  { name: "Dark Green", chatCode: "2", hexCode: "#00AA00" },
  { name: "Dark Aqua", chatCode: "3", hexCode: "#00AAAA", keywords: ["cyan"] },
  { name: "Dark Red", chatCode: "4", hexCode: "#AA0000" },
  { name: "Dark Purple", chatCode: "5", hexCode: "#AA00AA" },
  { name: "Gold", chatCode: "6", hexCode: "#FFAA00", keywords: ["orange"] },
  { name: "Gray", chatCode: "7", hexCode: "#AAAAAA" },
  { name: "Dark Gray", chatCode: "8", hexCode: "#555555" },
  { name: "Blue", chatCode: "9", hexCode: "#5555FF" },
  { name: "Green", chatCode: "a", hexCode: "#55FF55" },
  { name: "Aqua", chatCode: "b", hexCode: "#55FFFF", keywords: ["cyan"] },
  { name: "Red", chatCode: "c", hexCode: "#FF5555" },
  { name: "Light Purple", chatCode: "d", hexCode: "#FF55FF" },
  { name: "Yellow", chatCode: "e", hexCode: "#FFFF55" },
  { name: "White", chatCode: "f", hexCode: "#FFFFFF" },
];

export const FORMATTING: Format[] = [
  {
    name: "Obfuscated",
    icon: Icon.Hashtag,
    chatCode: "k",
    javaEdition: true,
    bedrockEdition: true,
  },
  {
    name: "Bold",
    icon: Icon.Bold,
    chatCode: "l",
    javaEdition: true,
    bedrockEdition: true,
  },
  {
    name: "Strikethrough",
    icon: Icon.StrikeThrough,
    chatCode: "m",
    javaEdition: true,
    bedrockEdition: false,
  },
  {
    name: "Underline",
    icon: Icon.Underline,
    chatCode: "n",
    javaEdition: true,
    bedrockEdition: false,
  },
  {
    name: "Italic",
    icon: Icon.Italics,
    chatCode: "o",
    javaEdition: true,
    bedrockEdition: true,
  },
  {
    name: "Reset",
    icon: Icon.Uppercase,
    chatCode: "r",
    javaEdition: true,
    bedrockEdition: true,
  },
];
