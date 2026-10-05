import { Action, ActionPanel, Detail, Icon, launchCommand } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import * as path from "node:path";
import { importFileName, readCategories, writeImportFile } from "./focusCategories.ts";
import { NOTHING_LEARNED, quickStartPlan, strandedList, type CategoryNeed } from "./goalBlocks.ts";
import { isRaycast2, learnGoalBlocks, RAYCAST_FOCUS, rememberSetUp } from "./runtime.ts";

async function importCategory(need: CategoryNeed) {
  let file: string;
  try {
    file = await writeImportFile(need.name, need.stranded);
  } catch (error) {
    await showFailureToast(error, { title: "Could not save the import file" });
    return;
  }
  await rememberSetUp(need.name).catch(() => undefined);
  await launchCommand({ ...RAYCAST_FOCUS, name: "import-focus-categories" }).catch((error) =>
    showFailureToast(error, { title: `Saved ${path.basename(file)} to Downloads, but could not open the importer` }),
  );
}

async function addToExisting(goal: string) {
  await rememberSetUp(goal).catch(() => undefined);
  await launchCommand({ ...RAYCAST_FOCUS, name: "search-focus-categories" }).catch((error) =>
    showFailureToast(error, { title: "Could not open Search Focus Categories" }),
  );
}

export function SetUpCategory({ goal }: { goal: string }) {
  const { data: learned, isLoading: learning } = useCachedPromise(learnGoalBlocks, []);
  const { data: categories, isLoading: reading } = useCachedPromise(readCategories, []);
  const isLoading = learning || reading;
  const { plan, need } = quickStartPlan(goal, learned ?? NOTHING_LEARNED, categories ?? [], isRaycast2);
  const verb = plan.mode === "allow" ? "allow" : "block";

  if (!need) {
    const markdown = `# Nothing to set up\n\nYour ${goal} quick start already ${verb}s everything you ${verb}ed last time.`;
    return <Detail isLoading={isLoading} navigationTitle="Set Up Categories" markdown={isLoading ? "" : markdown} />;
  }

  const { own, stranded } = need;
  const apps = stranded.filter((s) => s.app);
  const sites = stranded.filter((s) => !s.app);
  const update = isRaycast2 && need.exists;
  const them = stranded.length > 1 ? "them" : "it";
  const markdown = [
    `# Set Up ${own.title}`,
    `Your ${goal} quick start doesn't ${verb} ${strandedList(stranded)}.`,
    update
      ? `**Add to Existing ${own.title}** to ${verb} ${them} on every ${goal} quick start. In Raycast's Focus categories, pick ${own.title} and add ${them}.`
      : `**Import ${own.title}** to ${verb} ${them} on every ${goal} quick start. In Raycast's importer, press **Select File** and pick \`${importFileName(goal)}\` from Downloads.`,
  ].join("\n\n");

  const importIt = (
    <Action key="import" title={`Import ${own.title}`} icon={Icon.Plus} onAction={() => importCategory(need)} />
  );
  const addIt = (
    <Action key="add" title={`Add to Existing ${own.title}`} icon={Icon.Pencil} onAction={() => addToExisting(goal)} />
  );

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Set Up Categories"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {apps.length > 0 && (
            <Detail.Metadata.TagList title="Apps">
              {apps.map((s) => (
                <Detail.Metadata.TagList.Item key={s.id} text={s.title} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {sites.length > 0 && (
            <Detail.Metadata.TagList title="Websites">
              {sites.map((s) => (
                <Detail.Metadata.TagList.Item key={s.id} text={s.title} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={<ActionPanel>{!isRaycast2 ? importIt : update ? [addIt, importIt] : [importIt, addIt]}</ActionPanel>}
    />
  );
}
