import TurndownService from "turndown";

export const hideElements = (turndownService: TurndownService) => {
  turndownService.addRule("hide-elements", {
    filter: (node) => node.style.display === "none",
    replacement: () => "",
  });
};
