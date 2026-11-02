import { WithMyUsername } from "./components/my-username";
import { Profile } from "./components/profile";

export default function Command() {
  return (
    <WithMyUsername>
      {(username) => <Profile username={username} commitsOnly navigationTitle="My Commits" />}
    </WithMyUsername>
  );
}
