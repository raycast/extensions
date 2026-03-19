import { useState, useEffect } from "react";
import {
  Action,
  ActionPanel,
  Form,
  useNavigation,
  showToast,
  Toast,
  Clipboard,
  LocalStorage,
  Detail,
} from "@raycast/api";
import { TestInvokeMethodCommand } from "@aws-sdk/client-api-gateway";
import { getApiGatewayClient } from "../../services/clients/api-gateway";
import { getAWSErrorMessage } from "../../errors";

interface ApiGatewayInvokeProps {
  apiId: string;
  apiName: string;
  resourceId: string;
  resourcePath: string;
  httpMethod: string;
}

interface SavedTestCase {
  name: string;
  body: string;
  headers: string;
  queryString: string;
}

interface TestResult {
  status: number;
  body: string;
  headers: Record<string, string>;
  latency: number;
}

/**
 * Component to test invoke an API Gateway method
 */
export default function ApiGatewayInvoke({
  apiId,
  apiName,
  resourceId,
  resourcePath,
  httpMethod,
}: ApiGatewayInvokeProps) {
  const [body, setBody] = useState("{}");
  const [headers, setHeaders] = useState("{}");
  const [queryString, setQueryString] = useState("");
  const [savedTestCases, setSavedTestCases] = useState<SavedTestCase[]>([]);
  const [saveName, setSaveName] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  const storageKey = `apigateway_test_${apiId}_${resourceId}_${httpMethod}`;

  useEffect(() => {
    LocalStorage.getItem<string>(`${storageKey}_last`).then((lastTestCase) => {
      if (lastTestCase) {
        const parsed = JSON.parse(lastTestCase);
        setBody(parsed.body || "{}");
        setHeaders(parsed.headers || "{}");
        setQueryString(parsed.queryString || "");
      }
    });

    LocalStorage.getItem<string>(`${storageKey}_saved`).then((savedTestCasesString) => {
      if (savedTestCasesString) {
        setSavedTestCases(JSON.parse(savedTestCasesString));
      }
    });
  }, [storageKey]);

  async function handleSubmit(values: { body: string; headers: string; queryString: string }) {
    setIsLoading(true);
    try {
      const client = getApiGatewayClient();

      let parsedHeaders: Record<string, string> = {};
      try {
        parsedHeaders = JSON.parse(values.headers);
      } catch {
        // If headers are not valid JSON, ignore them
      }

      const pathWithQueryString = values.queryString ? `${resourcePath}?${values.queryString}` : resourcePath;

      const command = new TestInvokeMethodCommand({
        restApiId: apiId,
        resourceId: resourceId,
        httpMethod: httpMethod,
        body: values.body !== "{}" ? values.body : undefined,
        headers: Object.keys(parsedHeaders).length > 0 ? parsedHeaders : undefined,
        pathWithQueryString: pathWithQueryString,
      });

      const response = await client.send(command);

      const result: TestResult = {
        status: response.status || 0,
        body: response.body || "",
        headers: response.headers || {},
        latency: response.latency || 0,
      };

      setTestResult(result);

      // Save the last test case
      await LocalStorage.setItem(
        `${storageKey}_last`,
        JSON.stringify({
          body: values.body,
          headers: values.headers,
          queryString: values.queryString,
        }),
      );

      const statusStyle = result.status >= 200 && result.status < 300 ? Toast.Style.Success : Toast.Style.Failure;

      await showToast({
        style: statusStyle,
        title: `Status: ${result.status}`,
        message: `Latency: ${result.latency}ms`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Testing Method",
        message: getAWSErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveTestCase() {
    const trimmedName = saveName.trim();
    if (trimmedName) {
      const newTestCase: SavedTestCase = {
        name: trimmedName,
        body: body,
        headers: headers,
        queryString: queryString,
      };

      const existingIndex = savedTestCases.findIndex((tc) => tc.name === trimmedName);
      let newSavedTestCases;
      if (existingIndex !== -1) {
        newSavedTestCases = [...savedTestCases];
        newSavedTestCases[existingIndex] = newTestCase;
      } else {
        newSavedTestCases = [...savedTestCases, newTestCase];
      }

      setSavedTestCases(newSavedTestCases);
      await LocalStorage.setItem(`${storageKey}_saved`, JSON.stringify(newSavedTestCases));
      setSaveName("");

      await showToast({
        style: Toast.Style.Success,
        title: "Test Case Saved",
        message: `Saved as "${trimmedName}"`,
      });
    }
  }

  async function handleDeleteTestCase(nameToDelete: string) {
    const newSavedTestCases = savedTestCases.filter((tc) => tc.name !== nameToDelete);
    setSavedTestCases(newSavedTestCases);
    await LocalStorage.setItem(`${storageKey}_saved`, JSON.stringify(newSavedTestCases));

    await showToast({
      style: Toast.Style.Success,
      title: "Test Case Deleted",
      message: `Deleted "${nameToDelete}"`,
    });
  }

  function handleLoadTestCase(testCase: SavedTestCase) {
    setBody(testCase.body);
    setHeaders(testCase.headers);
    setQueryString(testCase.queryString);
  }

  async function handleCopyResponse() {
    if (testResult) {
      await Clipboard.copy(testResult.body);
      await showToast({
        style: Toast.Style.Success,
        title: "Response Copied",
        message: "Response body copied to clipboard",
      });
    }
  }

  // Show result view if we have a test result
  if (testResult) {
    const statusColor =
      testResult.status >= 200 && testResult.status < 300
        ? "green"
        : testResult.status >= 400 && testResult.status < 500
          ? "orange"
          : "red";

    let formattedBody = testResult.body;
    try {
      formattedBody = JSON.stringify(JSON.parse(testResult.body), null, 2);
    } catch {
      // Keep original if not JSON
    }

    const markdown = `# Test Result

## ${httpMethod} ${resourcePath}

**Status:** \`${testResult.status}\` ${statusColor === "green" ? "✅" : statusColor === "orange" ? "⚠️" : "❌"}

**Latency:** ${testResult.latency}ms

### Response Headers
\`\`\`json
${JSON.stringify(testResult.headers, null, 2)}
\`\`\`

### Response Body
\`\`\`json
${formattedBody}
\`\`\`
`;

    return (
      <Detail
        markdown={markdown}
        navigationTitle={`${httpMethod} ${resourcePath} - Result`}
        actions={
          <ActionPanel>
            <Action title="Test Again" onAction={() => setTestResult(null)} />
            <Action title="Copy Response" onAction={handleCopyResponse} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            <Action title="Go Back" onAction={pop} shortcut={{ modifiers: ["cmd"], key: "escape" }} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Test ${httpMethod} ${resourcePath}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Test Invoke" onSubmit={handleSubmit} />
          <Action title="Save Test Case" onAction={handleSaveTestCase} shortcut={{ modifiers: ["cmd"], key: "s" }} />
          {savedTestCases.length > 0 && (
            <ActionPanel.Submenu title="Load Test Case" shortcut={{ modifiers: ["cmd"], key: "l" }}>
              {savedTestCases.map((testCase) => (
                <Action key={testCase.name} title={testCase.name} onAction={() => handleLoadTestCase(testCase)} />
              ))}
            </ActionPanel.Submenu>
          )}
          {savedTestCases.length > 0 && (
            <ActionPanel.Submenu title="Delete Test Case" shortcut={{ modifiers: ["cmd"], key: "d" }}>
              {savedTestCases.map((testCase) => (
                <Action
                  key={testCase.name}
                  title={testCase.name}
                  onAction={() => handleDeleteTestCase(testCase.name)}
                />
              ))}
            </ActionPanel.Submenu>
          )}
        </ActionPanel>
      }
    >
      <Form.Description title="API" text={`${apiName} (${apiId})`} />
      <Form.Description title="Endpoint" text={`${httpMethod} ${resourcePath}`} />
      <Form.Separator />
      <Form.TextArea
        id="body"
        title="Request Body"
        placeholder='Enter JSON body, e.g., {"key": "value"}'
        value={body}
        onChange={setBody}
      />
      <Form.TextArea
        id="headers"
        title="Headers (JSON)"
        placeholder='Enter headers as JSON, e.g., {"Content-Type": "application/json"}'
        value={headers}
        onChange={setHeaders}
      />
      <Form.TextField
        id="queryString"
        title="Query String"
        placeholder="e.g., param1=value1&param2=value2"
        value={queryString}
        onChange={setQueryString}
      />
      <Form.Separator />
      <Form.TextField
        id="saveName"
        title="Save As"
        placeholder="Enter a name to save this test case"
        value={saveName}
        onChange={setSaveName}
      />
    </Form>
  );
}
