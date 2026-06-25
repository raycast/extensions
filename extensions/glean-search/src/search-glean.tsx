import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { useEffect, useState } from "react";
import { promisify } from "util";
const execFileAsync = promisify(execFile);

interface GleanSnippet {
  mimeType: string;
  text: string;
}

interface GleanDocument {
  datasource: string;
  docType: string;
  metadata: Record<string, unknown>;
  title: string;
  url: string;
}

interface GleanResult {
  title: string;
  url: string;
  document: GleanDocument;
  snippets: GleanSnippet[];
}

interface GleanSearchResponse {
  cursor?: string;
  hasMoreResults: boolean;
  requestID: string;
  results: GleanResult[];
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<GleanResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    const fetchResults = async () => {
      if (!searchText.trim()) {
        setResults([]);
        return;
      }

      const preferences = getPreferenceValues();

      const env: NodeJS.ProcessEnv = {
        ...process.env,
        PATH: ["/usr/local/bin", "/opt/homebrew/bin", process.env.PATH].filter(Boolean).join(":"),
      };

      if (preferences.gleanHost) {
        env.GLEAN_HOST = preferences.gleanHost;
      }

      setIsLoading(true);

      try {
        const { stdout } = await execFileAsync("glean", ["search", searchText], {
          env,
          encoding: "utf-8",
        });

        const parsed: GleanSearchResponse = JSON.parse(stdout);
        setResults(parsed.results ?? []);
      } catch (error: unknown) {
        const typedError = error as Error & { code?: string; stderr?: string };

        if (typedError.code === "ENOENT") {
          showToast(
            Toast.Style.Failure,
            "Glean Search Failed",
            "glean command not found. Install from https://github.com/gleanwork/glean-cli",
          );
        } else {
          const message = typedError.stderr?.trim() ?? typedError.message?.trim() ?? "Unknown error";

          showToast(Toast.Style.Failure, "Glean Search Failed", message);
        }

        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      throttle
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search company knowledge base..."
    >
      {results.map((item, index) => {
        const rawSnippet = item.snippets?.[0]?.text ?? "";
        const cleanedSnippet = rawSnippet.replace(/¶/g, "").replace(/\s+/g, " ").trim();
        const firstSnippet = cleanedSnippet.length <= 80 ? cleanedSnippet : cleanedSnippet.slice(0, 80) + "…";

        return (
          <List.Item
            key={item.url + index}
            title={item.title}
            subtitle={item.document?.datasource}
            accessories={
              firstSnippet
                ? [
                    {
                      text: firstSnippet,
                      tooltip: cleanedSnippet || undefined,
                    },
                  ]
                : undefined
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <Action.CopyToClipboard content={item.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
