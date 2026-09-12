import type { Favorite } from "../api/favorites";

type LabelFavorite = NonNullable<Favorite["label"]>;

// Workspace-level labels aren't tied to a team, so they have no team-scoped
// URL to open and should render without an Open action.
export function getLabelOpenProps(baseLinearUrl: string, label: LabelFavorite): { title: string; url: string } | null {
  if (!label.team) {
    return null;
  }

  return {
    title: "Open Label",
    url: `${baseLinearUrl}/team/${label.team.key}/label/${label.name}`,
  };
}
