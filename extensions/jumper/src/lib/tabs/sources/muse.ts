// Muse (Meta): "Main chat" and the side chats in its "Side chats" navigation. A hovered row's title gains
// "<date> More thread actions", and rows ignore AXPress, so they're opened by keyboard.

import { sidebarSource } from "./sidebar";

const DATE = String.raw`\d{1,2}:\d{2}\s?[AP]M|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Yesterday|Today|Now|[A-Z][a-z]{2} \d{1,2}(?:, \d{4})?|\d{1,2}/\d{1,2}(?:/\d{2,4})?|\d+[mhdw]`;

export const muse = sidebarSource({
  id: "muse",
  bundleId: "com.meta.endo",
  kind: "session",
  container: "Side chats",
  rowRole: "AXButton",
  format: "plain",
  namePattern: String.raw`^(.+?)(?:\s+(?:${DATE}))?\s+More thread actions$`,
  keyboard: true,
  skip: ["Side chats", "New side chat"],
});
