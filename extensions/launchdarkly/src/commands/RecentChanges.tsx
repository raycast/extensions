import { List } from "@raycast/api";
import AuditLogList from "../components/AuditLogList";
import { useProjectKey } from "../hooks/useProjectKey";

export default function RecentChanges() {
  const { projectKey, isLoading } = useProjectKey();
  if (isLoading) return <List isLoading navigationTitle="Recent Changes" />;
  return <AuditLogList projectKey={projectKey} />;
}
