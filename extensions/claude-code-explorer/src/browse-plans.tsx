import { List, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { readdir, readFile, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { formatRelativeTime } from "./lib/utils";

const PLANS_DIR = join(homedir(), ".claude", "plans");

interface PlanFile {
  name: string;
  title?: string;
  path: string;
  content: string;
  modifiedAt: Date;
}

function extractFirstHeading(content: string): string | undefined {
  return content.match(/^#\s+(.+)/m)?.[1]?.trim();
}

async function loadPlans(): Promise<PlanFile[]> {
  try {
    const entries = await readdir(PLANS_DIR, { withFileTypes: true });
    const plans = await Promise.all(
      entries
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map(async (e) => {
          const filePath = join(PLANS_DIR, e.name);
          const [s, content] = await Promise.all([
            stat(filePath),
            readFile(filePath, "utf-8"),
          ]);
          return {
            name: e.name.replace(/\.md$/, ""),
            title: extractFirstHeading(content),
            path: filePath,
            content,
            modifiedAt: s.mtime,
          };
        }),
    );
    return plans.sort(
      (a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime(),
    );
  } catch {
    return [];
  }
}

export default function Command() {
  const { data: plans, isLoading } = useCachedPromise(loadPlans);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search plans..."
    >
      {plans?.map((plan) => (
        <List.Item
          key={plan.path}
          title={plan.title ?? plan.name}
          accessories={[
            {
              text: formatRelativeTime(plan.modifiedAt),
              tooltip: plan.modifiedAt.toLocaleString(),
            },
          ]}
          detail={<List.Item.Detail markdown={plan.content} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Path"
                content={plan.path}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              <Action.Open title="Open in Editor" target={plan.path} />
              <Action.ShowInFinder title="Show in Finder" path={plan.path} />
              <Action.Trash
                title="Delete Plan"
                paths={[plan.path]}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
