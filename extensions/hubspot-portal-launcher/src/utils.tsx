import { Icon } from "@raycast/api";

const portalTypeIcons: Record<string, Icon> = {
  Production: Icon.Play,
  Sandbox: Icon.WrenchScrewdriver,
  "CMS Sandbox": Icon.Globe,
  Dev: Icon.CodeBlock,
  Test: Icon.Bug,
};

export { portalTypeIcons };
