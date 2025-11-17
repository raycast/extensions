import ErrorBoundary from "./components/ErrorBoundary";
import { WritingFeature } from "./features/writing/WritingFeature";

// Removed unnecessary model logging

export default function Command() {
  return (
    <ErrorBoundary>
      <WritingFeature />
    </ErrorBoundary>
  );
}
