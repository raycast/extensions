import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import { aiManager } from "./services/aiManager";
import { TestResult } from "./utils/types";

export default function Command() {
  const [testResults, setTestResults] = useState<Record<string, TestResult>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function runTests() {
      try {
        setIsLoading(true);
        const results = await aiManager.testAllConnections(true);
        setTestResults(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : "未知错误");
      } finally {
        setIsLoading(false);
      }
    }

    runTests();
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="测试失败"
          description={error}
          icon={{ source: "error.png" }}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {Object.entries(testResults).map(([provider, result]) => (
        <List.Item
          key={provider}
          title={`${provider} ${result.success ? "✅" : "❌"}`}
          subtitle={result.message}
          accessories={[
            {
              text: result.details?.model || "N/A",
            },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Provider"
                    text={provider}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={result.success ? "Success" : "Failed"}
                  />
                  {result.details?.model && (
                    <List.Item.Detail.Metadata.Label
                      title="Model"
                      text={result.details.model}
                    />
                  )}
                  {result.details?.response && (
                    <List.Item.Detail.Metadata.Label
                      title="Response"
                      text={result.details.response}
                    />
                  )}
                  {result.details?.error && (
                    <List.Item.Detail.Metadata.Label
                      title="Error"
                      text={result.details.error}
                    />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
