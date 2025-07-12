// show-usage.tsx
import { Detail, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

type PlanType = {
  planId?: string;
  usage?: Record<string, unknown>;
  limits?: Record<string, unknown>;
  socialPosts?: unknown;
};
export default function Command() {
  const [plan, setPlan] = useState<PlanType | null>(null);
  const { "Session Token": sessionToken } = getPreferenceValues();

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch("https://logggai.run/api/billing/current", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        const data = (await res.json()) as { plan?: PlanType };
        setPlan(data.plan || {});
      } catch {
        showToast({ style: Toast.Style.Failure, title: "Failed to fetch plan" });
      }
    }
    fetchPlan();
  }, [sessionToken]);

  if (!plan) return <Detail isLoading markdown="Loading..." />;

  return (
    <Detail
      markdown={`## Current Plan: ${plan.planId}

- **Posts:** ${plan.usage?.posts} / ${plan.limits?.posts}
- **AI:** ${plan.usage?.ai} / ${plan.limits?.ai}
- **API Calls:** ${plan.usage?.apiCalls} / ${plan.limits?.apiCalls}
- **Integrations:** ${plan.limits?.integrations}
- **Social Posts:** ${plan.usage?.socialPosts} / ${plan.limits?.socialPosts}
`}
    />
  );
}
