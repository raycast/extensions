import { Icon, Image } from "@raycast/api";

export const glpiIconTicketStatus: Record<number, Image.ImageLike> = {
  /* New */
  1: { source: Icon.CircleFilled, tintColor: { dark: "#4ABF4D", light: "#4ABF4D" } },
  /* Processing (assigned) */
  2: { source: Icon.Circle, tintColor: { dark: "#4ABF4D", light: "#4ABF4D" } },
  /* Processing (planned) */
  3: { source: Icon.Calendar, tintColor: { dark: "#1A2F62", light: "#1A2F62" } },
  /* Pending */
  4: { source: Icon.CircleFilled, tintColor: { dark: "#FEA500", light: "#FEA500" } },
  /* Solved */
  5: { source: Icon.Circle, tintColor: { dark: "#000", light: "#000" } },
  /* Closed */
  6: { source: Icon.CircleFilled, tintColor: { dark: "#000", light: "#000" } },
  /* Approval */
  10: { source: Icon.QuestionMarkCircle, tintColor: { dark: "#8CABDB", light: "#8CABDB" } },
};
