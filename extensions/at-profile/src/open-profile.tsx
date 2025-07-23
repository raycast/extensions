import { LaunchProps } from "@raycast/api";
import OpenProfileForm from "./forms/open-profile-form";
import { OpenProfileArguments } from "./types";

export default function OpenProfileCommand(props: LaunchProps<{ arguments: OpenProfileArguments }>) {
  const { profile, app } = props.arguments;

  return <OpenProfileForm initialProfile={profile} initialApp={app} />;
}
