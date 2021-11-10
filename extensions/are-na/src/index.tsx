import { Detail, showToast, ToastStyle } from "@raycast/api";
import { useEffect } from "react";
import { useProfile } from "./hooks/useProfile";
import { prefs } from "./util/preferences";

export default function Command() {
  const { data: user, error } = useProfile();

  useEffect(() => {
    if (error) showToast(ToastStyle.Failure, "An Error Occured.", (error as any).message);
  }, [error]);
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
