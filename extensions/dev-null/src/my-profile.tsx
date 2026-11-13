import { WithMyUsername } from "./components/my-username";
import { Profile } from "./components/profile";

export default function Command() {
  return <WithMyUsername>{(username) => <Profile username={username} navigationTitle="My Profile" />}</WithMyUsername>;
}
