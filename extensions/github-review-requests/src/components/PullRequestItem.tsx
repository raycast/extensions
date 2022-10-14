import { MenuBarExtra } from "@raycast/api";
import { PullRequestShort } from "../types";

type PullRequestItemParams = {
  pull: PullRequestShort;
  onAction: () => void;
  showMyIcon?: boolean;
  index?: number;
};

const PullRequestItem = ({ pull, index, showMyIcon, onAction }: PullRequestItemParams) => (
  <MenuBarExtra.Item
    icon={pull.user.avatarUrl}
    key={pull.id}
    title={(showMyIcon ? pull.myIcon + " " : "") + pull.title}
    onAction={() => onAction()}
    shortcut={
      index !== undefined && index <= 8 ? { modifiers: ["cmd"], key: (index + 1).toString() as ValidNumber } : undefined
    }
  />
);

export default PullRequestItem;

type ValidNumber = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
