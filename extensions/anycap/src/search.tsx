import { callTool } from "./anycap";
import { CaptureList } from "./captures";

/// Empty, the newest captures; typed, every term must match, and meaning
/// matches follow.
export default function SearchAnycap() {
  return (
    <CaptureList
      placeholder="Search your captures"
      load={(query, kind) =>
        query.trim()
          ? callTool("search", { query, limit: 50, ...(kind ? { kind } : {}) })
          : callTool("recent", { days: 30, limit: 50 })
      }
      emptyTitle={(query) => (query.trim() ? "No matches" : "Nothing captured this month")}
    />
  );
}
