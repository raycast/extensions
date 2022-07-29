import { MenuBarExtra } from "@raycast/api";
import { PullRequestShort } from "../types";

type PullRequestItemParams = {
  pull: PullRequestShort;
  onAction: () => void;
  showMyIcon?: boolean;
};

const PullRequestItem = ({ pull, showMyIcon, onAction }: PullRequestItemParams) => (
  <MenuBarExtra.Item
    icon={pull.user.avatarUrl}
    key={pull.id}
    title={(showMyIcon ? pull.myIcon + " " : "") + pull.title}
    onAction={() => onAction()}
  />
);

export default PullRequestItem;
