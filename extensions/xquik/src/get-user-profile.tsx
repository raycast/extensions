import { LaunchProps } from "@raycast/api";
import { ProfileScreen } from "./components/profile-screen";

export default function Command({ arguments: { username } }: LaunchProps<{ arguments: Arguments.GetUserProfile }>) {
  return <ProfileScreen user={username} />;
}
