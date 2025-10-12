import { Color } from "@raycast/api";

export function getAccessoriesFromFlavors(flavors: string[]) {
  return flavors.map((flavor) => {
    let color: Color | undefined;

    switch (flavor) {
      case "upstream":
        color = Color.SecondaryText; // gray
        break;
      case "unicorn":
        color = Color.Purple;
        break;
      case "registry1":
        color = Color.Green;
        break;
      default:
        color = Color.PrimaryText; // leave unstyled
    }

    return { tag: { value: flavor, color } };
  });
}
