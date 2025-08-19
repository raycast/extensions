import { Detail, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  type ContextType = {
    currentContext?: string;
    organization?: { name?: string };
    user?: { email?: string };
  };
  const [context, setContext] = useState<ContextType | null>(null);
  const { "Session Token": sessionToken } = getPreferenceValues();

  useEffect(() => {
    async function fetchContext() {
      try {
        const res = await fetch("https://logggai.run/api/user/context", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        const data = (await res.json()) as ContextType;
        setContext(data);
      } catch {
        showToast({ style: Toast.Style.Failure, title: "Failed to fetch context" });
      }
    }
    fetchContext();
  }, [sessionToken]);

  if (!context) return <Detail isLoading markdown="Loading..." />;

  return (
    <Detail
      markdown={`## Current Context

- **Type:** ${context.currentContext}
- **Organization:** ${context.organization?.name || "Personal"}
- **User:** ${context.user?.email || "Unknown"}
`}
    />
  );
}
