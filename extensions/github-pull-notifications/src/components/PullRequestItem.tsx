import { MenuBarExtra } from "@raycast/api";
import { PullSearchResultShort } from "../integration/types";

type PullRequestItemParams = {
  pull: PullSearchResultShort;
  showMyIcon?: boolean;
  onAction: () => void;
};

const PullRequestItem = ({pull, onAction, showMyIcon=false}: PullRequestItemParams) => (
  <MenuBarExtra.Item
    title={(showMyIcon ? pull.myIcon + " " || "" : "") + pull.title}
    icon={pull.user?.avatar_url}
    onAction={onAction}
  />
)

export default PullRequestItem;
