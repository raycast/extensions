import ErrorBoundary from "./components/ErrorBoundary";
import { WritingFeature } from "./features/writing/WritingFeature";

// 已移除不必要的模型打印日志

export default function Command() {
  return (
    <ErrorBoundary>
      <WritingFeature />
    </ErrorBoundary>
  );
}
