// Todoist priorities are reversed
import { Color } from "@raycast/api";

export const priorities = [
  { name: "Low", value: 1, searchKeyword: "p4" },
  { name: "Medium", value: 2, color: Color.Blue, searchKeyword: "p3" },
  { name: "High", value: 3, color: Color.Orange, searchKeyword: "p2" },
  { name: "Urgent", value: 4, color: Color.Red, searchKeyword: "p1" },
];
