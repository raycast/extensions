import { LaunchProps } from "@raycast/api";
import { ApplicationDetail } from "./application-detail";
import { ApplicationList } from "./application-list";

export default function Command(props: LaunchProps<{ arguments: { appName?: string } }>) {
  const appName = props.arguments?.appName?.trim();
  if (appName) return <ApplicationDetail name={appName} />;
  return <ApplicationList />;
}
