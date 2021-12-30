// Todoist priorities are reversed
import { Color } from "@raycast/api";

export const priorities = [
  { name: "Low", value: 1, searchKeyword: "p4" },
  { name: "Medium", value: 2, color: Color.Blue, searchKeyword: "p3" },
  { name: "High", value: 3, color: Color.Orange, searchKeyword: "p2" },
  { name: "Urgent", value: 4, color: Color.Red, searchKeyword: "p1" },
];

export const projectColors = [
  { name: "Berry Red", id: 30 },
  { name: "Red", id: 31 },
  { name: "Orange", id: 32 },
  { name: "Yellow", id: 33 },
  { name: "Olive Green", id: 34 },
  { name: "Lime Green", id: 35 },
  { name: "Green", id: 36 },
  { name: "Mint Green", id: 37 },
  { name: "Teal", id: 38 },
  { name: "Sky Blue", id: 39 },
  { name: "Light Blue", id: 40 },
  { name: "Blue", id: 41 },
  { name: "Grape", id: 42 },
  { name: "Violet", id: 43 },
  { name: "Lavender", id: 44 },
  { name: "Magenta", id: 45 },
  { name: "Salmon", id: 46 },
  { name: "Charcoal", id: 47 },
  { name: "Grey", id: 48 },
  { name: "Taupe", id: 49 },
];

export const defaultColor = 48;
