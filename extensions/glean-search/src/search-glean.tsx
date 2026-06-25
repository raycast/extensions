import { Action, ActionPanel, Form, List, open, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { useGlean } from "./lib/glean";
import type { GleanResult } from "./lib/types";

export default function Command() {
  const { cliPath, isInitializing, auth, needsEmail, retryCliDiscovery, search, signIn, recheckAuth } = useGlean();

  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<GleanResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Authenticated search ───────────────────────────────────────────────
  useEffect(() => {
    if (!cliPath || auth?.state !== "authenticated" || !searchText.trim()) {
      setResults([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let cancelled = false;

    const fetchResults = async () => {
      setIsSearching(true);
      try {
        const items = await search(searchText, controller.signal);
        if (!cancelled) setResults(items);
      } catch (err) {
        if (cancelled) return;
        const error = err as Error & { code?: string; stderr?: string };
        if (error.name === "AbortError") return;

        const stderr = error.stderr?.trim() ?? "";
        if (stderr.toLowerCase().includes("not authenticated") || stderr.toLowerCase().includes("auth")) {
          showToast({
            style: Toast.Style.Failure,
            title: "Session expired",
            message: "Sign in again to continue searching",
            primaryAction: { title: "Sign In", onAction: () => signIn() },
          });
          recheckAuth();
          return;
        }

        showToast(Toast.Style.Failure, "Search failed", stderr || error.message || "Unknown error");
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    };

    fetchResults();

    return () => {
      cancelled = true;
    };
  }, [cliPath, auth?.state, searchText, search]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // ── Loading state ──────────────────────────────────────────────────────
  if (isInitializing) {
    return (
      <List isLoading searchBarPlaceholder="Search company knowledge base…">
        <List.EmptyView title="Setting up Glean CLI…" description="Checking for Glean CLI and authentication" />
      </List>
    );
  }

  // ── CLI not found ──────────────────────────────────────────────────────
  if (!cliPath) {
    return (
      <List>
        <List.EmptyView
          title="Glean CLI not found"
          description="Install via Homebrew or download the binary"
          actions={
            <ActionPanel>
              <Action title="Download Cli Automatically" onAction={() => retryCliDiscovery()} />
              <Action
                title="Open Download Page"
                onAction={() => open("https://github.com/gleanwork/glean-cli/releases")}
              />
              <Action
                title="Install Via Homebrew"
                onAction={() => open("https://github.com/gleanwork/glean-cli#installation")}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // ── Not authenticated ──────────────────────────────────────────────────
  if (!auth || auth.state === "unauthenticated") {
    if (needsEmail) {
      return (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm onSubmit={({ email }) => signIn(email as string)} />
            </ActionPanel>
          }
        >
          <Form.TextField id="email" title="Work Email" placeholder="you@company.com" />
        </Form>
      );
    }

    return (
      <List>
        <List.EmptyView
          title="Not signed in to Glean"
          description="Sign in to search your company's knowledge base"
          actions={
            <ActionPanel>
              <Action title="Sign in to Glean" onAction={() => signIn()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // ── Auth error ─────────────────────────────────────────────────────────
  if (auth.state === "error") {
    return (
      <List>
        <List.EmptyView
          title="Authentication error"
          description={auth.error ?? "Check your Glean host configuration"}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={recheckAuth} />
              <Action title="Sign In" onAction={signIn} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // ── Main search UI ─────────────────────────────────────────────────────
  // ── Auth checking (defensive — no code currently produces this state) ──
  if (auth.state === "checking") {
    return <List isLoading />;
  }

  return (
    <List
      isLoading={isSearching}
      throttle
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search company knowledge base…"
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
