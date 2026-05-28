import { useRef, useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Toast,
  showToast,
  openExtensionPreferences,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { getIndex } from "./lib/cache";
import { aggregateSkills } from "./lib/aggregate";
import {
  buildCatalog,
  buildPrompt,
  parseRecommendations,
  resolveRecommendations,
} from "./lib/recommend";
import { chat, AIUnavailableError } from "./lib/llm";
import { RecommendationItem } from "./components/RecommendationItem";
import type { Recommendation } from "./lib/types";

export default function Command() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [showingDetail, setShowingDetail] = useState(false);
  const cache = useRef(new Map<string, Recommendation[]>());

  async function run(force = false) {
    const q = query.trim();
    if (!q) return;
    const cached = cache.current.get(q);
    if (cached && !force) {
      setRecs(cached);
      return;
    }
    setLoading(true);
    setUnavailable(false);
    try {
      const skills = aggregateSkills((await getIndex()).skills);
      if (skills.length === 0) {
        setRecs([]);
        return;
      }
      const reply = await chat(buildPrompt(q, buildCatalog(skills)));
      const result = resolveRecommendations(
        parseRecommendations(reply),
        skills,
      );
      cache.current.set(q, result);
      setRecs(result);
    } catch (e) {
      if (e instanceof AIUnavailableError) {
        setUnavailable(true);
      } else {
        const message =
          e instanceof Error && e.name === "TimeoutError"
            ? "AI timed out — try again"
            : e instanceof Error
              ? e.message
              : String(e);
        await showToast({
          style: Toast.Style.Failure,
          title: "Recommendation failed",
          message,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  if (unavailable) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Stars}
          title="AI unavailable"
          description="Set an API key in Preferences, or use Search Skills."
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action
                title="Open Search Skills"
                icon={Icon.MagnifyingGlass}
                onAction={() =>
                  launchCommand({
                    name: "search-skills",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      filtering={false}
      isLoading={loading}
      isShowingDetail={showingDetail}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Describe your task, then press ⏎"
    >
      <List.Item
        icon={Icon.Stars}
        title={
          query.trim()
            ? `Get recommendations for "${query.trim()}"`
            : "Type your task, then press ⏎"
        }
        actions={
          <ActionPanel>
            <Action
              title="Get Recommendations"
              icon={Icon.Stars}
              onAction={run}
            />
          </ActionPanel>
        }
      />
      {recs?.length === 0 && !loading && (
        <List.Item
          icon={Icon.QuestionMark}
          title="No matching skill — try rephrasing"
        />
      )}
      {recs?.map((rec) => (
        <RecommendationItem
          key={rec.skill.key}
          rec={rec}
          onRerun={() => run(true)}
          onToggleDetail={() => setShowingDetail((v) => !v)}
        />
      ))}
    </List>
  );
}
