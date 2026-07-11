import Extension from "./Extension";

import useRenderColor from "./hooks/useRenderColor";
import useFavorites from "./hooks/useFavorites";
import useHistory from "./hooks/useHistory";

export default function Command() {
  return <Extension renderer={useRenderColor()} favorites={useFavorites()} history={useHistory()} />;
}
