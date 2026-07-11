import { Action, Icon, open } from "@raycast/api";
import { ProjectLink } from "../../types";

interface OpenAllLinksActionProps {
  links: ProjectLink[];
}

export function OpenAllLinksAction({ links }: OpenAllLinksActionProps) {
  const openAllLinks = async () => {
    for (const link of links) {
      await open(link.url);
    }
  };

  return (
    <Action
      title="Open All Links"
      icon={Icon.Globe}
      onAction={openAllLinks}
      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
    />
  );
}
