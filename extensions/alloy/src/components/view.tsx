import { withAccessToken } from "@raycast/utils";
import { provider } from "@/features/auth/api/oauth";

function View({ children }: { children: React.ReactNode }) {
  return children;
}

export default withAccessToken(provider)(View);
