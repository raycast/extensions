// commands/run-code.tsx
import { Form, ActionPanel, Action } from "@raycast/api";
import { useCodeRunner } from "./hooks/useCodeRunner"; // Import the custom hook
import { CodeRunnerForm } from "./components/CodeRunnerForm"; // Import the presentational component

/**
 * Main Raycast command component for the Code Runner.
 * Encapsulates the use of the custom hook and renders the form.
 */
export default function Command() {
  const {
    code,
    language,
    result,
    availableLanguages,
    isInitializing,
    isExecutingCode,
    onCodeChange,
    onLanguageChange,
    onRunCode,
    performLanguageDetection, // Exposed for retry action
  } = useCodeRunner();

  // 1. Show a general loading screen if isInitializing is true
  if (isInitializing) {
    return (
      <Form isLoading={true}>
        <Form.Description title="Loading" text="Detecting available languages..." />
      </Form>
    );
  }

  // 2. If isInitializing is false, but no languages were detected at all
  if (availableLanguages.length === 0) {
    return (
      <Form isLoading={false}>
        <Form.Description
          title="No Supported Languages Found"
          text="Please ensure Node.js, Python3, Go, or Swift are installed and in your system's PATH."
        />
        <ActionPanel>
          <Action title="Retry Language Detection" onAction={() => performLanguageDetection(true)} />
        </ActionPanel>
      </Form>
    );
  }

  // 3. If isInitializing is false and languages are available, show the main form
  return (
    <CodeRunnerForm
      code={code}
      language={language}
      result={result}
      availableLanguages={availableLanguages}
      isExecutingCode={isExecutingCode}
      onCodeChange={onCodeChange}
      onLanguageChange={onLanguageChange}
      onRunCode={onRunCode}
      onClearCode={() => onCodeChange("")} // Simple clear code action
    />
  );
}
