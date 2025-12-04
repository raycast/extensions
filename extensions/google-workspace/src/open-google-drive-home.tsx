import { getUserEmail } from "./api/googleAuth";
import { withGoogleAuth } from "./components/withGoogleAuth";
import { open } from "@raycast/api";

async function Command() {
  const email = await getUserEmail();

  const searchParams = new URLSearchParams();
  if (email) {
    searchParams.append("authuser", email);
  }

  await open(`https://drive.google.com/drive/u/0/my-drive?${searchParams.toString()}`);
}

export default withGoogleAuth(Command);
