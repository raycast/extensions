import TurndownService from "turndown";

const blockRegex =
  /^(address|blockquote|body|center|dir|div|dl|fieldset|form|h[1-6]|hr|isindex|menu|noframes|noscript|ol|p|pre|table|ul|dd|dt|frameset|li|tbody|td|tfoot|th|thead|tr|html)$/i;

export const blockAnchors = (turndownService: TurndownService) => {
  turndownService.addRule("block-anchors", {
    filter: (node) => {
      if (node.nodeName !== "A") {
        return false;
      }

      const descendants = node.querySelectorAll("*");
      return Array.from(descendants).some((innerNode) => {
        const isBlock = blockRegex.test(innerNode.nodeName);
        return isBlock;
      });
    },
    replacement: (content) => {
      return content;
    },
  });
};
