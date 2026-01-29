import { Detail } from "@raycast/api";
import { withAccessToken, getAccessToken } from "@raycast/utils";
import { useEffect, useState } from "react";
import { ouraOAuth } from "./lib/oauth";
import { getLatestBiometrics } from "./lib/oura";
import { calculateDecisionReadiness, getStatusEmoji } from "./lib/algorithm";
import { DecisionReadiness } from "./types";

function CheckReadinessCommand() {
  const [readiness, setReadiness] = useState<DecisionReadiness | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { token } = getAccessToken();

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        const biometrics = await getLatestBiometrics(token);
        const result = calculateDecisionReadiness(biometrics);
        setReadiness(result);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch data";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [token]);

  if (error) {
    return (
      <Detail
        markdown={`# ❌ Error

${error}

## Troubleshooting

1. Make sure you have an active Oura membership
2. Try disconnecting and reconnecting your Oura account (use Raycast preferences)
3. Ensure you wore your Oura Ring last night and data is synced
`}
      />
    );
  }

  if (!readiness) {
    return (
      <Detail
        isLoading={isLoading}
        markdown="# Loading your biometric data..."
      />
    );
  }

  const emoji = getStatusEmoji(readiness.status);

  const markdown = `# ${emoji} Decision Readiness: ${readiness.score}/100

## ${readiness.message}

---

### Today's Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Sleep Score | ${readiness.metrics.sleep.value ?? "N/A"} | ${readiness.metrics.sleep.label} |
| Readiness | ${readiness.metrics.readiness.value ?? "N/A"} | ${readiness.metrics.readiness.label} |
| HRV Balance | ${readiness.metrics.hrv.value ?? "N/A"} | ${readiness.metrics.hrv.label} |

---

### Recommendation

${readiness.recommendation}

---

*Data from Oura Ring • P360 Decision Support*
`;

  return <Detail isLoading={isLoading} markdown={markdown} />;
}

export default withAccessToken(ouraOAuth)(CheckReadinessCommand);
