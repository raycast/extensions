import { Detail } from "@raycast/api";
import { useApfelCheck } from "../hooks/useApfelCheck";

import NotFoundView from "../views/not-found";
import IntelligenceNotReadyView from "../views/intelligence-not-ready";
import FinderPermissionDeniedView from "../views/finder-permission-denied";

export function ApfelGuard(props: { children: React.ReactNode; checkForFileSystemPermission?: boolean }) {
  const { data, isLoading } = useApfelCheck(props.checkForFileSystemPermission);

  if (isLoading) return <Detail isLoading />;
  else if (data === "not_installed") return <NotFoundView />;
  else if (data === "ai_unavailable") return <IntelligenceNotReadyView />;
  else if (data === "finder_permission_denied") return <FinderPermissionDeniedView />;

  return <>{props.children}</>;
}
