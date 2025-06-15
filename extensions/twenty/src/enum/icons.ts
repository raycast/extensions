import { Icon } from "@raycast/api";

export const ObjectIcons: Record<string, string> = {
  IconCheckbox: Icon.CheckList,
  IconTargetArrow: Icon.BullsEyeMissed,
  IconNotes: Icon.Receipt,
  IconBuildingSkyscraper: Icon.Building,
  IconUser: Icon.Person,
};

// same color palette used as twenty labels
export const optionIcons: Record<string, { source: string; tintColor: string }> = {
  green: { source: "status_icon.png", tintColor: "#2A5822" },
  turquoise: { source: "status_icon.png", tintColor: "#166747" },
  sky: { source: "status_icon.png", tintColor: "#0E6874" },
  blue: { source: "status_icon.png", tintColor: "#18356D" },
  purple: { source: "status_icon.png", tintColor: "#483473" },
  pink: { source: "status_icon.png", tintColor: "#702C61" },
  red: { source: "status_icon.png", tintColor: "#712727" },
  orange: { source: "status_icon.png", tintColor: "#743B1B" },
  yellow: { source: "status_icon.png", tintColor: "#746224" },
  grey: { source: "status_icon.png", tintColor: "#4C4C4C" },
  white: { source: "status_icon.png", tintColor: "#D6D6D6" },
};
