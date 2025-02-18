import ErrorBoundary from "./components/ErrorBoundary";
import { WritingFeature } from "./features/writing/WritingFeature";

export default function Command() {
  return (
    <ErrorBoundary>
      <WritingFeature />
    </ErrorBoundary>
  );
}
