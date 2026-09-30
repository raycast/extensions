import { Color, Icon } from "@raycast/api";

export function getMethodIcon(method: string): { source: Icon; tintColor: Color } {
  switch (method.toUpperCase()) {
    case "GET":
      return { source: Icon.MagnifyingGlass, tintColor: Color.Blue };
    case "POST":
      return { source: Icon.Plus, tintColor: Color.Green };
    case "PUT":
      return { source: Icon.Pencil, tintColor: Color.Orange };
    case "PATCH":
      return { source: Icon.Pencil, tintColor: Color.Yellow };
    case "DELETE":
      return { source: Icon.Trash, tintColor: Color.Red };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

export function getMethodTagColor(method: string): Color {
  switch (method.toUpperCase()) {
    case "GET":
      return Color.Blue;
    case "POST":
      return Color.Green;
    case "PUT":
      return Color.Orange;
    case "PATCH":
      return Color.Yellow;
    case "DELETE":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}
