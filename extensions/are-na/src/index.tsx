import { Detail } from "@raycast/api";
import { useProfile } from "./hooks/useProfile";
import { prefs } from "./util/preferences";

export default function Command() {
  const { data: user, error, isLoading } = useProfile(prefs().accesstoken);

  return (
    <Detail
      isLoading={!user}
      markdown={`
# Hello world!
debug:
\`\`\`
${JSON.stringify(user, null, 2)}
\`\`\`

`}
    />
  );
}
