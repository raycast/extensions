import { useRef } from "react";
import dayjs from "dayjs";
import { getPreferenceValues, Keyboard } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { dateToPageTitle } from "./roam-api-sdk-copy";

export function crossPlatformShortcut(
  modifiers: Keyboard.KeyModifier[],
  key: Keyboard.KeyEquivalent
): Keyboard.Shortcut {
  return {
    macOS: { modifiers, key },
    Windows: { modifiers: modifiers.map((m) => (m === "cmd" ? "ctrl" : m)) as Keyboard.KeyModifier[], key },
  };
}

// Pure function for resolving the instant capture template and its graph.
// Non-hook so the no-view command (async function, not React) can use it.
// Resolution: (1) explicit instantCaptureTemplateId, (2) implicit single-template fallback, (3) undefined.
export function resolveInstantCapture(
  templatesConfig: TemplatesConfig,
  graphsConfig: GraphsConfigMap
): { template: CaptureTemplate; graphConfig: GraphConfig } | undefined {
  const effectiveTemplates =
    templatesConfig.templates.length > 0
      ? templatesConfig.templates
      : [{ ...BUILTIN_DEFAULT_TEMPLATE, id: "__builtin__" } as CaptureTemplate];

  // Step 1: Explicit designation
  if (templatesConfig.instantCaptureTemplateId) {
    const tmpl = effectiveTemplates.find((t) => t.id === templatesConfig.instantCaptureTemplateId);
    if (tmpl?.graphName) {
      const graphConfig = graphsConfig[tmpl.graphName];
      if (graphConfig) return { template: tmpl, graphConfig };
    }
    // Designated template not found or graph missing — fall through to implicit
  }

  // Step 2: Implicit single-template fallback
  if (effectiveTemplates.length === 1) {
    const tmpl = effectiveTemplates[0];
    const graphNames = Object.keys(graphsConfig);
    if (tmpl.graphName) {
      const graphConfig = graphsConfig[tmpl.graphName];
      if (graphConfig) return { template: tmpl, graphConfig };
    } else if (graphNames.length === 1) {
      return { template: tmpl, graphConfig: graphsConfig[graphNames[0]] };
    }
    // Universal template + multiple graphs — can't resolve
  }

  // Step 3: No resolution
  return undefined;
}

// Pure function: resolves the tags for a capture based on template tags + DNP preference.
// Callers that also have form-level tags (e.g. QuickCaptureForm's TagPicker) merge them on top.
export function resolveCaptureTags(template: CaptureTemplate, preferences: Preferences): string[] {
  const templateTags = template.tags || [];
  const isNonDailyNotesPage = !!template.page;
  const todayDnpPageTitle = dateToPageTitle(new Date());
  const dnpTag =
    isNonDailyNotesPage && preferences.quickCaptureTagTodayDnp && todayDnpPageTitle ? [todayDnpPageTitle] : [];
  return [...new Set([...templateTags, ...dnpTag])];
}

export const BUILTIN_DEFAULT_TEMPLATE: Omit<CaptureTemplate, "id"> = {
  name: "Default Template",
  page: undefined,
  nestUnder: "[[Raycast]]",
  tags: [],
  contentTemplate: "- {time} {content} {tags}",
};

const normalizeWhitespace = (s: string) => s.replace(/\s/g, "");
const OLD_DEFAULT_TEMPLATE = "- from [[Raycast]] at {date} \n  - {content}";

// Returns the first saved template, or the hardcoded built-in default if none exist.
// Used for empty-state rendering and as the fallback when no templates are saved.
export function getFirstTemplate(templatesConfig: TemplatesConfig): CaptureTemplate {
  return templatesConfig.templates[0] ?? { ...BUILTIN_DEFAULT_TEMPLATE, id: "__builtin__" };
}

// Hook for centralized template storage. All templates (universal and graph-specific)
// live in a single ordered array. Template ordering is purely cosmetic (display order).
export const useTemplatesConfig: () => {
  templatesConfig: TemplatesConfig;
  isTemplatesConfigLoading: boolean;
  saveTemplate: (template: CaptureTemplate) => void;
  removeTemplate: (templateId: string) => void;
  moveTemplate: (templateId: string, direction: "up" | "down") => void;
  setInstantCaptureTemplate: (templateId: string) => void;
  clearInstantCaptureTemplate: () => void;
} = () => {
  const {
    value: templatesConfig = { templates: [] },
    setValue: setTemplatesConfig,
    isLoading: isTemplatesConfigLoading,
  } = useLocalStorage<TemplatesConfig>("templates-config", { templates: [] });

  const templatesRef = useRef(templatesConfig);
  templatesRef.current = templatesConfig;

  const migrationRan = useRef(false);

  const updateTemplates = (next: TemplatesConfig) => {
    templatesRef.current = next;
    setTemplatesConfig(next);
  };

  // Auto-migration from old quickCaptureTemplate preference (one-time, on first load)
  if (
    !isTemplatesConfigLoading &&
    !migrationRan.current &&
    templatesRef.current.templates.length === 0 &&
    !templatesRef.current.legacyTemplateConsumed
  ) {
    migrationRan.current = true;
    const legacyTemplate = getPreferenceValues<Preferences>().quickCaptureTemplate;
    const isCustomized = normalizeWhitespace(legacyTemplate) !== normalizeWhitespace(OLD_DEFAULT_TEMPLATE);
    if (isCustomized) {
      updateTemplates({
        templates: [
          {
            ...BUILTIN_DEFAULT_TEMPLATE,
            contentTemplate: legacyTemplate,
            nestUnder: undefined,
            id: "__builtin__",
          },
        ],
        legacyTemplateConsumed: true,
      });
    } else {
      updateTemplates({ ...templatesRef.current, legacyTemplateConsumed: true });
    }
  }

  const saveTemplate = (template: CaptureTemplate) => {
    const cur = templatesRef.current;
    const existing = cur.templates;
    const idx = existing.findIndex((t) => t.id === template.id);
    const updated = idx >= 0 ? existing.map((t, i) => (i === idx ? template : t)) : [...existing, template];
    // If the saved template is the designated instant capture template and it's now universal, clear designation
    const shouldClearInstantCapture = cur.instantCaptureTemplateId === template.id && !template.graphName;
    updateTemplates({
      ...cur,
      templates: updated,
      legacyTemplateConsumed: template.id === "__builtin__" ? true : cur.legacyTemplateConsumed,
      ...(shouldClearInstantCapture ? { instantCaptureTemplateId: undefined } : {}),
    });
  };

  const removeTemplate = (templateId: string) => {
    const cur = templatesRef.current;
    const shouldClearInstantCapture = cur.instantCaptureTemplateId === templateId;
    updateTemplates({
      ...cur,
      templates: cur.templates.filter((t) => t.id !== templateId),
      ...(shouldClearInstantCapture ? { instantCaptureTemplateId: undefined } : {}),
    });
  };

  const moveTemplate = (templateId: string, direction: "up" | "down") => {
    const cur = templatesRef.current;
    const templates = [...cur.templates];
    const idx = templates.findIndex((t) => t.id === templateId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= templates.length) return;
    [templates[idx], templates[swapIdx]] = [templates[swapIdx], templates[idx]];
    updateTemplates({ ...cur, templates });
  };

  const setInstantCaptureTemplate = (templateId: string) => {
    const cur = templatesRef.current;
    updateTemplates({ ...cur, instantCaptureTemplateId: templateId });
  };

  const clearInstantCaptureTemplate = () => {
    const cur = templatesRef.current;
    updateTemplates({ ...cur, instantCaptureTemplateId: undefined });
  };

  return {
    templatesConfig,
    isTemplatesConfigLoading,
    saveTemplate,
    removeTemplate,
    moveTemplate,
    setInstantCaptureTemplate,
    clearInstantCaptureTemplate,
  } as const;
};

// hook that you should use to get graph settings like name, token
// this stores it in Raycast's encrypted localstorage
// note that we DO NOT store this in Raycast's cache because it's unsecure and because it's an LRU cache, it can remove least recently used data when more than 10 MB in cache
// might want to move this to someplace like `./roamApi.ts`
export const useGraphsConfig: () => {
  graphsConfig: GraphsConfigMap;
  saveGraphConfig: (obj: GraphConfig) => void;
  removeGraphConfig: (graphName: string) => void;
  isGraphsConfigLoading: boolean;
  orderedGraphNames: string[];
  moveGraph: (graphName: string, direction: "up" | "down") => void;
} = () => {
  const {
    value: graphsConfig = {},
    setValue: setGraphsConfig,
    isLoading: isGraphsConfigLoading,
  } = useLocalStorage<GraphsConfigMap>("graphs-config", {});

  const { value: graphOrder = [], setValue: setGraphOrder } = useLocalStorage<string[]>("graph-order", []);

  // Ref to avoid stale closures: useLocalStorage's setValue doesn't support
  // callback form (prev => next), so rapid successive calls would read stale
  // state. The ref is updated synchronously after each write so the next
  // setter in the same tick sees the latest value.
  const graphsRef = useRef(graphsConfig);
  graphsRef.current = graphsConfig;

  const orderRef = useRef(graphOrder);
  orderRef.current = graphOrder;

  const updateGraphs = (next: GraphsConfigMap) => {
    graphsRef.current = next;
    setGraphsConfig(next);
  };

  const updateOrder = (next: string[]) => {
    orderRef.current = next;
    setGraphOrder(next);
  };

  // Derive ordered graph names: filter to existing graphs, append any unordered ones
  const existingNames = Object.keys(graphsConfig);
  const orderedGraphNames = [
    ...graphOrder.filter((name) => existingNames.includes(name)),
    ...existingNames.filter((name) => !graphOrder.includes(name)),
  ];

  const saveGraphConfig = (obj: GraphConfig) => {
    const cur = graphsRef.current;
    const isNewGraph = !(obj.nameField in cur);
    updateGraphs({ ...cur, [obj.nameField]: obj });
    if (isNewGraph) {
      updateOrder([...orderRef.current, obj.nameField]);
    }
  };

  const removeGraphConfig = (graphName: string) => {
    const newGraphsConfig = { ...graphsRef.current };
    delete newGraphsConfig[graphName];
    updateGraphs(newGraphsConfig);
    updateOrder(orderRef.current.filter((n) => n !== graphName));
  };

  const moveGraph = (graphName: string, direction: "up" | "down") => {
    const order = [...orderRef.current];
    // Ensure all existing graphs are in the order array
    const existingNames = Object.keys(graphsRef.current);
    for (const name of existingNames) {
      if (!order.includes(name)) order.push(name);
    }
    const idx = order.indexOf(graphName);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= order.length) return;
    [order[idx], order[swapIdx]] = [order[swapIdx], order[idx]];
    updateOrder(order);
  };

  return {
    graphsConfig,
    saveGraphConfig,
    removeGraphConfig,
    isGraphsConfigLoading,
    orderedGraphNames,
    moveGraph,
  } as const;
};

export const keys = <T extends object>(obj: T) => {
  return Object.keys(obj) as (keyof T)[];
};

export const values = <T extends object>(obj: T) => {
  return Object.values(obj) as T[keyof T][];
};

export const timeformatFromMs = (n?: number) => {
  return dayjs(n).format("HH:mm:ss YYYY-MM-DD");
};

const replaceMarkdownMap = {
  // github style TODO and DONE. Can be used because Raycast is using https://github.com/apple/swift-markdown which is powered by GitHub-flavored Markdown's cmark-gfm implementation: https://github.com/github/cmark-gfm
  "{{[[TODO]]}}": "- [ ]",
  "{{[[DONE]]}}": "- [x]",
  // have to do this otherwise first few lines of the code block appear outside of the codeblock
  "```": "```\n\n",
};

const detailMarkdownHelper = (block: ReversePullBlock, searchStr: string | null = null) => {
  // would love if we could highight the search matches, but CommonMark does not seem to support it
  //   asked if there is a workaround in the Raycast Slack: https://raycastcommunity.slack.com/archives/C02HEMAF2SJ/p1690456636469459
  //   in the absence of that, will do both bold and italics
  //   This is not as desirable as it is not as apparent and can still cause issues if block already has such formatting
  let mainBlockStr: string = block[":block/string"] || block[":node/title"] || "";
  for (const [key, value] of Object.entries(replaceMarkdownMap)) {
    mainBlockStr = mainBlockStr.replaceAll(key, value);
  }
  if (!mainBlockStr.startsWith("```")) {
    // if code block, do not do any of the following replacements
    if (block[":block/refs"]) {
      for (const ref of block[":block/refs"]) {
        if (ref[":block/string"]) {
          mainBlockStr = mainBlockStr.replaceAll("((" + ref[":block/uid"] + "))", "((" + ref[":block/string"] + "))");
        }
      }
    }
    if (searchStr) {
      for (const word of searchStr.split(" ")) {
        // to make this better, would want to NOT do this in places like inside code blocks where it wouldn't work anyways
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        mainBlockStr = mainBlockStr.replace(new RegExp(escaped, "i"), function (match: string) {
          return "***" + match + "***";
        });
      }
    }
  }
  if (block?.[":node/title"]) {
    return `Page: [[${mainBlockStr}]]`;
  } else {
    const strs: string[] = [];
    let ary = block?.[":block/_children"];
    while (ary && ary.length) {
      const b = ary[0];
      strs.unshift(b[":block/string"] || b[":node/title"] || "");
      ary = b[":block/_children"];
    }
    return `${strs.join("  >  ")}\n\n---
${mainBlockStr}

                `;
  }
};

export const detailMarkdown = (block: ReversePullBlock, searchStr: string | null = null) => {
  const res: string = detailMarkdownHelper(block, searchStr);
  // size is mostly an issue for large code blocks. If we do not truncate these then they cause beachball and require force quit of Raycast
  if (res.length > 5000) {
    return res.substring(0, 5000) + "\n\n\n TRUNCATED RESULT: Go to the block in Roam to view in full";
  } else {
    return res;
  }
};

export const todayUid = () => {
  return dayjs().format("MM-DD-YYYY");
};
