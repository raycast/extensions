import { Detail, LaunchProps, environment, getPreferenceValues } from "@raycast/api";
import FollowedAccountLists from "../components/FollowedAccountLists";

export default function Search(props: LaunchProps) {
  const { launchType } = props;
  console.log(`Searching ${launchType}`);
  return <FollowedAccountLists />;
}
