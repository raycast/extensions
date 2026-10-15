import {
  Action,
  ActionPanel,
  Color,
  Form,
  Grid,
  Icon,
  List,
  LaunchType,
  useNavigation,
  environment,
  getPreferenceValues,
  launchCommand,
  openCommandPreferences,
  Keyboard,
} from "@raycast/api";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  resolveSearch,
  SearchService,
  type Configuration,
  type Hit,
  type SearchResult,
} from "./backend";
import { escapeMarkdown, previewText, previewHint } from "./preview";
import { readConfiguration } from "./settings";
import ConfigureFolders from "./configure";
import ReviewScope from "./review-scope";
import { QueryInterpreter } from "./decision";
import { rankResults } from "./ranking";
import { describePlan } from "./plan";

const emptyResults: SearchResult = { hits: [], strong: 0, meaning: false };
const filters = [
  ["auto", "Automatic", Icon.MagnifyingGlass],
  ["all", "All Files", Icon.MagnifyingGlass],
  ["image", "Images", Icon.Image],
  ["screenshot", "Screenshots", Icon.Desktop],
  ["documents", "Documents", Icon.Document],
  ["audio", "Audio", Icon.Music],
  ["video", "Video", Icon.Video],
  ["code", "Code", Icon.Code],
] as const;

function errorText(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to search your files.";
}
function folderLabel(path: string) {
  const folder = dirname(path),
    home = homedir();
  return folder === home
    ? "~"
    : folder.startsWith(`${home}/`)
      ? `~${folder.slice(home.length)}`
      : folder;
}
function matchedPart(hit: Hit): string | undefined {
  if (hit.loc === undefined) return;
  if (hit.segment === "page" || hit.segment === "page_image")
    return `Page ${Math.floor(hit.loc)}`;
  if (hit.segment === "lines")
    return `Line ${Math.floor(hit.focus ?? hit.loc)}`;
  if (hit.segment === "cells") return `Cell ${Math.floor(hit.loc)}`;
  if (hit.segment === "frame" || hit.segment === "audio") {
    const seconds = Math.max(0, Math.floor(hit.loc));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }
}

function AdjustInterpretation({
  query,
  description,
  onSearch,
  service,
}: {
  query: string;
  description?: string;
  onSearch: (query: string) => void;
  service?: SearchService;
}) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  return (
    <Form
      navigationTitle="Adjust Interpretation"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Search Again"
            onSubmit={(values: { query: string; correction?: string }) => {
              const text = [
                values.query.trim(),
                values.correction?.trim() &&
                  `Correction: ${values.correction.trim()}`,
              ]
                .filter(Boolean)
                .join("\n");
              if (!text || text.length > 512) {
                setError("Use a request between 1 and 512 characters.");
                return;
              }
              service?.feedback.correct(query, text);
              onSearch(text);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Best Interpretation"
        text={
          description ??
          "Local meaning and keyword search. No completed model interpretation is available."
        }
      />
      <Form.TextArea id="query" title="Request" defaultValue={query} />
      <Form.TextArea
        id="correction"
        title="Correction"
        placeholder="Describe what Lens misunderstood…"
        error={error}
      />
    </Form>
  );
}

function SetupActions({
  onSaved,
  adjust,
}: {
  onSaved: () => void;
  adjust?: () => void;
}) {
  return (
    <ActionPanel>
      {adjust && (
        <Action
          title="Adjust Interpretation"
          icon={Icon.Pencil}
          onAction={adjust}
        />
      )}
      <Action.Push
        title="Choose Search Folders"
        icon={Icon.Folder}
        target={<ConfigureFolders onSaved={onSaved} />}
      />
      <Action.Push
        title="Review Automatic Exclusions"
        icon={Icon.Eye}
        target={<ReviewScope />}
      />
      <Action
        title="Add Decision Model API Key"
        icon={Icon.Gear}
        onAction={openCommandPreferences}
      />
    </ActionPanel>
  );
}

function ResultDetail({
  hit,
  service,
  searchLabel,
}: {
  hit: Hit;
  service: SearchService;
  searchLabel?: string;
}) {
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setMarkdown("");
    async function load() {
      const heading = `## ${escapeMarkdown(basename(hit.path))}\n\n`;
      let content = hit.excerpt?.replace(/[«»]/g, "") ?? "";
      if (["image", "screenshot", "pdf", "video"].includes(hit.kind)) {
        const response = await service.request(
          {
            op: "render",
            path: hit.path,
            kind: hit.kind === "screenshot" ? "image" : hit.kind,
            loc: hit.loc,
            pixels: 900,
          },
          15_000,
          controller.signal,
        );
        if (typeof response.image === "string")
          content = `![Preview](${pathToFileURL(response.image).href})`;
        if (hit.kind === "pdf" && hit.segment !== "name") {
          const text = await service.request(
            {
              op: "text",
              segment: hit.segment_id,
              path: hit.path,
              modified: hit.modified,
              size: hit.size,
              segment_kind: hit.segment,
              loc: hit.loc ?? null,
            },
            15_000,
            controller.signal,
          );
          if (typeof text.text === "string" && text.text.trim())
            content = previewHint(text.text, hit.excerpt) + content;
        }
      } else if (hit.kind === "doc" || hit.kind === "code") {
        const response = await service.request(
          {
            op: "text",
            segment: hit.segment_id,
            path: hit.path,
            modified: hit.modified,
            size: hit.size,
            segment_kind: hit.segment,
            loc: hit.loc ?? null,
            code: hit.kind === "code",
          },
          15_000,
          controller.signal,
        );
        if (typeof response.text === "string") content = response.text;
        content =
          hit.segment === "name"
            ? "**Filename match**\n\nUse Quick Look to read this file."
            : previewText(
                content,
                hit.kind,
                hit.excerpt ??
                  content.slice(0, 350).replace(/[\uD800-\uDBFF]$/u, ""),
              );
      } else if (hit.kind === "audio") {
        content = `**Audio recording**${matchedPart(hit) ? ` · Match at ${matchedPart(hit)}` : ""}\n\nUse Quick Look to listen.`;
      }
      if (active) setMarkdown(heading + content);
    }
    load()
      .catch(() => {
        if (active)
          setMarkdown(
            `## ${escapeMarkdown(basename(hit.path))}\n\nPreview unavailable. Use Quick Look to view this file.`,
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [hit.path, hit.segment_id, hit.modified, hit.size, hit.excerpt, service]);
  return (
    <List.Item.Detail
      isLoading={loading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          {searchLabel && (
            <List.Item.Detail.Metadata.Label
              title="Search"
              text={searchLabel}
            />
          )}
          <List.Item.Detail.Metadata.Label
            title="Type"
            text={hit.kind === "doc" ? "Document" : hit.kind.toUpperCase()}
          />
          {matchedPart(hit) && (
            <List.Item.Detail.Metadata.Label
              title="Matched Part"
              text={matchedPart(hit)}
            />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Folder"
            text={dirname(hit.path)}
          />
          <List.Item.Detail.Metadata.Label
            title="Modified"
            text={new Date(hit.modified * 1000).toLocaleDateString()}
          />
          <List.Item.Detail.Metadata.Label
            title="Size"
            text={new Intl.NumberFormat(undefined, {
              style: "unit",
              unit: "kilobyte",
              maximumFractionDigits: 1,
            }).format(hit.size / 1024)}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function FileResult({
  hit,
  service,
  toggleWeaker,
  onSaved,
  searchLabel,
  adjust,
  query,
}: {
  hit: Hit;
  service: SearchService;
  toggleWeaker?: () => void;
  onSaved: () => void;
  searchLabel?: string;
  adjust?: () => void;
  query?: string;
}) {
  return (
    <List.Item
      id={hit.path}
      title={basename(hit.path)}
      icon={{ fileIcon: hit.path }}
      subtitle={folderLabel(hit.path)}
      accessories={
        matchedPart(hit)
          ? [{ tag: { value: matchedPart(hit)!, color: Color.SecondaryText } }]
          : []
      }
      quickLook={{ path: hit.path, name: basename(hit.path) }}
      detail={
        <ResultDetail hit={hit} service={service} searchLabel={searchLabel} />
      }
      actions={
        <FileActions
          hit={hit}
          toggleWeaker={toggleWeaker}
          onSaved={onSaved}
          adjust={adjust}
          service={service}
          query={query}
        />
      }
    />
  );
}

function ImageResult({
  hit,
  service,
  toggleWeaker,
  onSaved,
  adjust,
  query,
}: {
  hit: Hit;
  service: SearchService;
  toggleWeaker?: () => void;
  onSaved: () => void;
  searchLabel?: string;
  adjust?: () => void;
  query?: string;
}) {
  const [thumbnail, setThumbnail] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setThumbnail(undefined);
    setFailed(false);
    service
      .request(
        { op: "render", path: hit.path, kind: "image", pixels: 480 },
        15_000,
        controller.signal,
      )
      .then((reply) => {
        if (typeof reply.image !== "string")
          throw new Error("Preview unavailable");
        if (active) setThumbnail(pathToFileURL(reply.image).href);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [hit.path, hit.modified, service]);
  return (
    <Grid.Item
      id={hit.path}
      title={basename(hit.path)}
      subtitle={
        failed ? "Preview unavailable · Use Quick Look" : folderLabel(hit.path)
      }
      content={{
        value: thumbnail ? { source: thumbnail } : Icon.Image,
        tooltip: hit.path,
      }}
      quickLook={{ path: hit.path, name: basename(hit.path) }}
      actions={
        <FileActions
          hit={hit}
          toggleWeaker={toggleWeaker}
          onSaved={onSaved}
          adjust={adjust}
          service={service}
          query={query}
        />
      }
    />
  );
}

function FileActions({
  hit,
  toggleWeaker,
  onSaved,
  adjust,
  service,
  query,
}: {
  hit: Hit;
  toggleWeaker?: () => void;
  onSaved: () => void;
  adjust?: () => void;
  service?: SearchService;
  query?: string;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Open title="Open File" target={hit.path} />
        <Action.ToggleQuickLook
          shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
        />
        <Action.ShowInFinder
          path={hit.path}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
        />
        <Action.OpenWith
          path={hit.path}
          shortcut={Keyboard.Shortcut.Common.OpenWith}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy File"
          content={{ file: hit.path }}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Path"
          content={hit.path}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {service && query && (
          <Action
            title="Mark as Relevant"
            icon={Icon.Checkmark}
            onAction={() => {
              service.feedback.rate(service.feedback.resolve(query), hit, true);
              onSaved();
            }}
          />
        )}
        {service && query && (
          <Action
            title="Mark as Not Relevant"
            icon={Icon.XMarkCircle}
            onAction={() => {
              service.feedback.rate(
                service.feedback.resolve(query),
                hit,
                false,
              );
              onSaved();
            }}
          />
        )}
        {service && (
          <Action
            title="Forget Search Corrections"
            icon={Icon.ArrowCounterClockwise}
            onAction={() => {
              service.feedback.clear();
              onSaved();
            }}
          />
        )}
        {adjust && (
          <Action
            title="Adjust Interpretation"
            icon={Icon.Pencil}
            onAction={adjust}
          />
        )}
        {toggleWeaker && (
          <Action
            title="Toggle Weaker Matches"
            icon={Icon.Eye}
            onAction={toggleWeaker}
          />
        )}
        <Action.Push
          title="Choose Search Folders"
          icon={Icon.Folder}
          target={<ConfigureFolders onSaved={onSaved} />}
        />
        <Action.Push
          title="Review Automatic Exclusions"
          icon={Icon.Eye}
          target={<ReviewScope />}
        />
        <Action
          title="Add Decision Model API Key"
          icon={Icon.Gear}
          onAction={openCommandPreferences}
        />
        <Action
          title="Update Search Index"
          icon={Icon.ArrowClockwise}
          onAction={() =>
            launchCommand({
              name: "index-files",
              type: LaunchType.UserInitiated,
            })
          }
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("auto");
  const [configuration, setConfiguration] = useState<Configuration>();
  const [service, setService] = useState<SearchService>();
  const [response, setResponse] = useState({
    query: "",
    kind: "auto",
    result: emptyResults,
    resolvedKind: undefined as string | undefined,
    notice: undefined as string | undefined,
  });
  const result =
    response.query === query && response.kind === kind
      ? response.result
      : emptyResults;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [showWeaker, setShowWeaker] = useState(false);
  const [folderVersion, setFolderVersion] = useState(0);
  const [interpreter] = useState(
    () =>
      new QueryInterpreter(
        getPreferenceValues<Preferences.Search>(),
        environment.supportPath,
      ),
  );
  const selection = useRef<{
    id?: string;
    manual: boolean;
    result?: SearchResult;
    pinned?: string;
  }>({ manual: false });
  if (
    selection.current.result !== result ||
    (selection.current.id === "lens:show-weaker" && showWeaker)
  ) {
    if (
      !selection.current.manual ||
      !(
        result.hits.some((hit) => hit.path === selection.current.id) ||
        (selection.current.id === "lens:show-weaker" &&
          result.hits.length > result.strong &&
          !showWeaker)
      )
    ) {
      selection.current.id = result.hits[0]?.path;
      selection.current.manual = false;
    }
    selection.current.pinned =
      selection.current.manual && selection.current.id !== result.hits[0]?.path
        ? selection.current.id
        : undefined;
    selection.current.result = result;
  }
  const onSelectionChange = useCallback((id: string | null) => {
    if (!id || id === selection.current.id) return;
    selection.current.manual = true;
    selection.current.id = id;
    setSelection((version) => version + 1);
  }, []);
  // Publish real native moves once; repeated selection echoes must not trigger another render.
  const [, setSelection] = useState(0);
  const localContentRanking =
    getPreferenceValues<Preferences.Search>().localContentRanking !== false;
  const reloadFolders = () => setFolderVersion((version) => version + 1);

  useEffect(() => {
    let session: SearchService | undefined;
    let active = true;
    setService(undefined);
    setError(undefined);
    readConfiguration()
      .then((config) => {
        if (!active) return;
        setConfiguration(config);
        if (!existsSync(config.binary))
          throw new Error(
            "The bundled engine is missing. Reinstall this extension.",
          );
        if (config.roots.length || config.codeRoots.length) {
          session = new SearchService(config);
          setService(session);
        }
      })
      .catch((error: unknown) => {
        if (active) setError(errorText(error));
      })
      .finally(() => {
        if (active && !interpreter.enabled) setLoading(false);
      });
    return () => {
      active = false;
      session?.close();
    };
  }, [folderVersion]);

  useEffect(() => {
    let active = true;
    let preview = true;
    const controller = new AbortController();
    const initial = { query, kind, resolvedKind: undefined, notice: undefined };
    setResponse({ ...initial, result: emptyResults });
    setShowWeaker(false);
    selection.current = { manual: false };
    if (!service || !query.trim()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    const effectiveQuery = service.feedback.resolve(query);
    let best = emptyResults;
    void service
      .search(effectiveQuery, kind, undefined, false, controller.signal)
      .then((result) => {
        if (active && preview) {
          best = result;
          setResponse({ ...initial, result });
        }
      })
      .catch((error: unknown) => {
        if (active && preview) setError(errorText(error));
      });
    const timer = setTimeout(async () => {
      if (!active) return;
      try {
        const decision = await interpreter.interpret(
          effectiveQuery,
          kind,
          controller.signal,
          () => {
            if (active)
              void service
                .request({ op: "prewarm" }, 15_000, controller.signal)
                .catch(() => {});
          },
        );
        if (!active) return;
        preview = false;
        setError(undefined);
        // Once strict constraints are known, a later failure must never restore unfiltered previews.
        if (decision.plan?.filter) {
          best = {
            ...emptyResults,
            plan: decision.plan,
            literal: !decision.plan.semantic,
            queryDescription: describePlan(decision.plan),
          };
          setResponse({
            ...initial,
            result: best,
            resolvedKind: decision.kind,
            notice: decision.notice,
          });
        }
        const interpreted = await service.search(
          effectiveQuery,
          decision.kind ?? kind,
          decision.plan,
          true,
          controller.signal,
        );
        if (!active) return;
        best = rankResults(interpreted, decision);
        setResponse({
          ...initial,
          result: service.feedback.apply(effectiveQuery, best),
          resolvedKind: decision.kind,
          notice: decision.notice,
        });
        let ranked = await interpreter.rerank(
          effectiveQuery,
          best,
          controller.signal,
        );
        if (!active) return;
        const guided =
          ranked !== interpreted ||
          decision.order ||
          decision.shape ||
          decision.detail;
        best = ranked;
        if (active)
          setResponse({
            ...initial,
            result: service.feedback.apply(effectiveQuery, ranked),
            resolvedKind: decision.kind,
            notice: decision.notice,
          });
        ranked = service.feedback.apply(
          effectiveQuery,
          localContentRanking
            ? await service.rerank(effectiveQuery, ranked, controller.signal)
            : ranked,
        );
        if (active)
          setResponse({
            ...initial,
            result: ranked,
            resolvedKind: decision.kind,
            notice:
              ranked.rankingNotice ??
              decision.notice ??
              (ranked.reranked
                ? `Local content ranking · ${ranked.reranked} candidates`
                : guided
                  ? `${interpreter.label} ranking guidance`
                  : decision.kind || decision.plan
                    ? `Interpreted by ${interpreter.label}`
                    : decision.notice),
          });
      } catch (error) {
        if (active && !controller.signal.aborted) {
          preview = false;
          setError(errorText(error));
          setResponse({
            ...initial,
            result: service.feedback.apply(effectiveQuery, best),
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, kind, service, interpreter, localContentRanking]);

  const scope = resolveSearch(query, kind);
  if (
    response.query === query &&
    response.kind === kind &&
    response.resolvedKind
  )
    scope.kind = response.resolvedKind;
  const code = scope.kind === "code";
  const visual = scope.kind === "image" || scope.kind === "screenshot";
  const View = visual ? Grid : List;
  const Result = visual ? ImageResult : FileResult;
  const scopeLabel = filters.find(([value]) => value === scope.kind)?.[1];
  const configured =
    configuration &&
    (code ? configuration.codeRoots : configuration.roots).length > 0;
  const pinned = result.hits.find(
    (hit) => hit.path === selection.current.pinned,
  );
  const strong = [
    ...(pinned ? [pinned] : []),
    ...result.hits.slice(0, result.strong).filter((hit) => hit !== pinned),
  ];
  const weaker = result.hits
    .slice(result.strong)
    .filter((hit) => hit !== pinned);
  const toggleWeaker = () => setShowWeaker((value) => !value);
  const interpreting =
    loading && interpreter.enabled && !result.plan && !result.meaning;
  const adjust = query.trim()
    ? () =>
        push(
          <AdjustInterpretation
            query={query}
            description={result.queryDescription ?? response.notice}
            onSearch={setQuery}
            service={service}
          />,
        )
    : undefined;
  return (
    <View
      isLoading={loading}
      filtering={false}
      throttle
      searchText={query}
      onSearchTextChange={setQuery}
      selectedItemId={selection.current.id}
      onSelectionChange={onSelectionChange}
      searchBarPlaceholder={
        code
          ? "Describe the code, or type a function name…"
          : "Describe a file, photo, recording or video…"
      }
      {...(visual
        ? {
            columns: 3,
            aspectRatio: "4/3" as const,
            fit: Grid.Fit.Contain,
            inset: Grid.Inset.Small,
          }
        : { isShowingDetail: result.hits.length > 0 })}
      searchBarAccessory={
        <View.Dropdown tooltip="File Type" value={kind} onChange={setKind}>
          {filters.map(([value, title, icon]) => (
            <View.Dropdown.Item
              key={value}
              value={value}
              title={
                value === "auto" && scope.kind !== "all" && scopeLabel
                  ? `Automatic · ${scopeLabel}`
                  : title
              }
              icon={icon}
            />
          ))}
        </View.Dropdown>
      }
    >
      {result.hits.length === 0 && (
        <View.EmptyView
          icon={
            error
              ? Icon.ExclamationMark
              : configured
                ? Icon.MagnifyingGlass
                : Icon.Folder
          }
          title={
            error
              ? "Unable to Search"
              : interpreting
                ? "Understanding Request"
                : !configured
                  ? code
                    ? "Choose Code Folders"
                    : "Choose Search Folders"
                  : query.trim()
                    ? visual
                      ? "No Matching Images"
                      : "No Matching Files"
                    : "Find It by What’s Inside"
          }
          description={
            error ??
            [
              result.queryDescription ??
                (response.query === query && response.kind === kind
                  ? response.notice
                  : undefined),
              !configured
                ? "Choose folders here in Raycast to build your local index."
                : result.plan?.filter || result.literal
                  ? "No indexed files match this interpretation. Use Adjust Interpretation to correct it."
                  : query.trim()
                    ? visual
                      ? "Try describing the picture, or choose All Files to search everything."
                      : "Try what you’d see or hear, or words you remember."
                    : interpreter.enabled
                      ? "Contents stay on this Mac. Decision models can use your query, filenames and technical metadata, according to Search preferences."
                      : "Search by meaning or exact words. Everything runs on this Mac.",
            ]
              .filter(Boolean)
              .join("\n")
          }
          actions={<SetupActions onSaved={reloadFolders} adjust={adjust} />}
        />
      )}
      {service && strong.length > 0 && (
        <View.Section
          title={
            interpreting
              ? "Keyword Preview"
              : result.literal
                ? "Filtered"
                : visual
                  ? "Images"
                  : "Matches"
          }
          subtitle={`${strong.length} ${strong.length === 1 ? "file" : "files"}${visual && result.queryDescription ? ` · ${result.queryDescription.length > 60 ? result.queryDescription.slice(0, 59) + "…" : result.queryDescription}` : ""}`}
        >
          {strong.map((hit) => (
            <Result
              key={hit.path}
              hit={hit}
              service={service}
              toggleWeaker={weaker.length ? toggleWeaker : undefined}
              onSaved={reloadFolders}
              searchLabel={result.queryDescription ?? response.notice}
              adjust={adjust}
              query={query}
            />
          ))}
        </View.Section>
      )}
      {service && weaker.length > 0 && (
        <View.Section
          title="Weaker Matches"
          subtitle={`${weaker.length} files`}
        >
          {!showWeaker &&
            (visual ? (
              <Grid.Item
                id="lens:show-weaker"
                title={`Show ${weaker.length} Weaker Matches`}
                content={Icon.ChevronDown}
                actions={
                  <ActionPanel>
                    <Action
                      title="Show Weaker Matches"
                      onAction={toggleWeaker}
                    />
                  </ActionPanel>
                }
              />
            ) : (
              <List.Item
                id="lens:show-weaker"
                title={`Show ${weaker.length} Weaker Matches`}
                icon={Icon.ChevronDown}
                actions={
                  <ActionPanel>
                    <Action
                      title="Show Weaker Matches"
                      onAction={toggleWeaker}
                    />
                  </ActionPanel>
                }
              />
            ))}
          {weaker
            .filter((hit) => showWeaker || hit.path === selection.current.id)
            .map((hit) => (
              <Result
                key={hit.path}
                hit={hit}
                service={service}
                toggleWeaker={toggleWeaker}
                onSaved={reloadFolders}
                searchLabel={result.queryDescription ?? response.notice}
                adjust={adjust}
                query={query}
              />
            ))}
        </View.Section>
      )}
    </View>
  );
}
