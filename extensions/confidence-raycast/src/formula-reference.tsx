import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { MATH_101 } from "./math/content";
import { processMath } from "./math/process";

type Mode = "analyze" | "plan";
type TestType = "oneProportion" | "proportion" | "means";

type Section = {
  id: string;
  group: "Background" | "Analyze" | "Plan" | "Reference";
  title: string;
  icon: Icon;
  markdown: string;
};

function extractSection(md: string, n: number): string {
  const re = new RegExp(`^## ${n}\\. `, "m");
  const start = md.search(re);
  if (start < 0) return "";
  const after = md.slice(start + 3);
  const nextRel = after.search(/\n## \d+\. /);
  const end = nextRel < 0 ? md.length : start + 3 + nextRel;
  return md.slice(start, end).trim();
}

function buildSections(md: string): Section[] {
  const concepts = extractSection(md, 0);
  const normal = extractSection(md, 1);
  const studentT = extractSection(md, 2);
  const oneProp = extractSection(md, 3);
  const twoProp = extractSection(md, 4);
  const welch = extractSection(md, 5);
  const planOne = extractSection(md, 6);
  const planTwo = extractSection(md, 7);
  const planMeans = extractSection(md, 8);
  const assumptions = extractSection(md, 9);

  return [
    {
      id: "concepts",
      group: "Background",
      title: "Concepts",
      icon: Icon.Book,
      markdown: concepts,
    },
    {
      id: "distributions",
      group: "Background",
      title: "Distributions",
      icon: Icon.LineChart,
      markdown: `${normal}\n\n---\n\n${studentT}`,
    },
    {
      id: "analyze-oneProportion",
      group: "Analyze",
      title: "One-Proportion",
      icon: Icon.MagnifyingGlass,
      markdown: oneProp,
    },
    {
      id: "analyze-proportion",
      group: "Analyze",
      title: "Two-Proportion",
      icon: Icon.MagnifyingGlass,
      markdown: twoProp,
    },
    {
      id: "analyze-means",
      group: "Analyze",
      title: "Means",
      icon: Icon.MagnifyingGlass,
      markdown: welch,
    },
    {
      id: "plan-oneProportion",
      group: "Plan",
      title: "One-Proportion",
      icon: Icon.Calendar,
      markdown: planOne,
    },
    {
      id: "plan-proportion",
      group: "Plan",
      title: "Two-Proportion",
      icon: Icon.Calendar,
      markdown: planTwo,
    },
    {
      id: "plan-means",
      group: "Plan",
      title: "Means",
      icon: Icon.Calendar,
      markdown: planMeans,
    },
    {
      id: "assumptions",
      group: "Reference",
      title: "Assumptions",
      icon: Icon.ExclamationMark,
      markdown: assumptions,
    },
    {
      id: "all",
      group: "Reference",
      title: "Full",
      icon: Icon.Document,
      markdown: md,
    },
  ];
}

function sectionIdFor(mode?: Mode, testType?: TestType): string | undefined {
  if (!mode || !testType) return undefined;
  return `${mode}-${testType}`;
}

export default function FormulaReference({
  initialMode,
  initialTestType,
}: {
  initialMode?: Mode;
  initialTestType?: TestType;
} = {}) {
  const sections = useMemo(() => buildSections(MATH_101), []);
  const groupedSections = useMemo(() => {
    const groups: Record<Section["group"], Section[]> = {
      Background: [],
      Analyze: [],
      Plan: [],
      Reference: [],
    };
    for (const s of sections) groups[s.group].push(s);
    return groups;
  }, [sections]);

  const initialId =
    sectionIdFor(initialMode, initialTestType) ?? sections[0].id;

  const [rendered, setRendered] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(initialId);
  }, [initialId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const entries = await Promise.all(
          sections.map(
            async (s): Promise<[string, string]> => [
              s.id,
              await processMath(s.markdown),
            ],
          ),
        );
        if (!cancelled) setRendered(Object.fromEntries(entries));
      } catch (e) {
        const errMd = `# Error\n\n\`\`\`\n${
          e instanceof Error ? e.message : String(e)
        }\n\`\`\``;
        if (!cancelled)
          setRendered(Object.fromEntries(sections.map((s) => [s.id, errMd])));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sections]);

  const groupOrder: Section["group"][] = [
    "Background",
    "Analyze",
    "Plan",
    "Reference",
  ];

  return (
    <List
      isShowingDetail
      isLoading={loading}
      navigationTitle="Formula Reference"
      selectedItemId={selectedId ?? undefined}
      onSelectionChange={(id) => setSelectedId(id)}
    >
      {groupOrder.map((group) => (
        <List.Section key={group} title={group}>
          {groupedSections[group].map((s) => (
            <List.Item
              key={s.id}
              id={s.id}
              title={s.title}
              icon={s.icon}
              detail={<List.Item.Detail markdown={rendered[s.id] ?? ""} />}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Fullscreen"
                    icon={Icon.Maximize}
                    target={
                      <Detail
                        markdown={rendered[s.id] ?? ""}
                        navigationTitle={`${s.group}: ${s.title}`}
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
