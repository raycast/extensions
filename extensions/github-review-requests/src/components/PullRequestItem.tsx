import {MenuBarExtra} from "@raycast/api";
import {PullRequestShort} from "../types";

const PullRequestItem = ({pull, onAction}: { pull: PullRequestShort, onAction: () => void }) => <MenuBarExtra.Item
  icon={pull.user.avatarUrl}
  key={pull.id}
  title={pull.title}
  onAction={() => onAction()}
/>

export default PullRequestItem;
