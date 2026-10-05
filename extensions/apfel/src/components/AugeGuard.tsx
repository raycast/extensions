import { Detail } from "@raycast/api";
import { useAugeCheck } from "../hooks/useAugeCheck";
import AugeNotFoundView from "../views/auge-not-found";
import FinderPermissionDeniedView from "../views/finder-permission-denied";

export function AugeGuard(props: { children: React.ReactNode; checkForFileSystemPermission?: boolean }) {
  const { data, isLoading } = useAugeCheck(props.checkForFileSystemPermission);

  if (isLoading) return <Detail isLoading />;
  else if (data === "not_installed") return <AugeNotFoundView />;
  else if (data === "finder_permission_denied") return <FinderPermissionDeniedView />;

  return <>{props.children}</>;
}
