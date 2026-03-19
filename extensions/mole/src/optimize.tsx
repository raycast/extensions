import { List, Icon, Color, ActionPanel, Action, Toast, showToast, confirmAlert } from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { useMemo } from "react";
import { getMolePathSafe, runMole } from "./utils/mole";
import { parseOptimizeDryRun } from "./utils/parsers";

export default function OptimizeSystem() {
  const molePath = useMemo(() => getMolePathSafe(), []);

  if (!molePath) {
    return (
      <List>
        <List.EmptyView
          title="Mole Not Installed"
          description="Install Mole to use this extension: brew install mole"
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  return <OptimizeView />;
}

function OptimizeView() {
  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    const output = await runMole(["optimize", "--dry-run"], { timeout: 120000 });
    return parseOptimizeDryRun(output);
  });

  async function handleOptimizeAll() {
    if (
      await confirmAlert({
        title: "Optimize System",
        message: `This will apply ${data?.totalOptimizations ?? 0} optimizations to your system. Some changes may require a restart to take full effect.`,
        primaryAction: { title: "Optimize All" },
      })
    ) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Optimizing system..." });
      try {
        await runMole(["optimize"], { timeout: 300000 });
        toast.style = Toast.Style.Success;
        toast.title = "System optimized successfully";
        revalidate();
      } catch (error) {
        await showFailureToast(error, { title: "Optimization failed" });
      }
    }
  }

  return (
    <List isLoading={isLoading}>
      {data && (
        <>
          <List.Section title="Summary">
            <List.Item
              title="Available Optimizations"
              icon={{ source: Icon.Gauge, tintColor: Color.Blue }}
              accessories={[{ tag: { value: `${data.totalOptimizations} optimizations`, color: Color.Blue } }]}
              actions={
                <ActionPanel>
                  <Action title="Optimize All" icon={Icon.Gauge} onAction={handleOptimizeAll} />
                  <Action title="Refresh Preview" icon={Icon.ArrowClockwise} onAction={revalidate} />
                </ActionPanel>
              }
            />
          </List.Section>
          {data.sections.map((section) => (
            <List.Section key={section.name} title={section.name}>
              {section.items.map((item, i) => (
                <List.Item
                  key={`${section.name}-${i}`}
                  title={item.description}
                  icon={Icon.Checkmark}
                  actions={
                    <ActionPanel>
                      <Action title="Optimize All" icon={Icon.Gauge} onAction={handleOptimizeAll} />
                      <Action title="Refresh Preview" icon={Icon.ArrowClockwise} onAction={revalidate} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}
