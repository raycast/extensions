import { MenuBarExtra } from "@raycast/api";
import { PullSearchResultShort } from "../integration/types";

const PullRequestItem = ({pull, onAction}: {pull: PullSearchResultShort, onAction: () => void}) => (
  <MenuBarExtra.Item
    title={pull.title}
    icon={pull.user?.avatar_url}
    onAction={onAction}
  />
)

export default PullRequestItem;
