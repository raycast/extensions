import { Icon, MenuBarExtra } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useSession } from "./lib/hooks/use-session";
import { mealsAccountKey } from "./lib/meals/drafts";
import { currentMonday, eatToday, windowLabel } from "./lib/meals/planning";
import { openMealsCommand } from "./lib/meals/navigation";
import { loadMealsOverview } from "./lib/meals/service";

export default function MealsStatusCommand() {
  const { session } = useSession({ interactive: false });
  const result = useCachedPromise(loadMealsOverview, [session ? mealsAccountKey(session.subject) : ""], {
    execute: Boolean(session),
    keepPreviousData: false,
  });
  const today = eatToday();
  const day =
    Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${currentMonday()}T12:00:00Z`)) / 86400000) + 1;
  const choice = result.data?.dashboard.myCurrentSelection?.items.find((item) => item.day === day);
  const title = choice?.main_name ?? (session ? "Meals" : "Connect Meals");
  if (process.platform !== "darwin") return null;
  return (
    <MenuBarExtra icon={Icon.Mug} title={title} tooltip="iPF OS Meals" isLoading={result.isLoading}>
      <MenuBarExtra.Item
        title={
          choice?.main_name
            ? [choice.main_name, choice.side_name].filter(Boolean).join(" · ")
            : "No meal selected for today"
        }
      />
      {result.data && <MenuBarExtra.Item title={windowLabel(result.data.dashboard.windowStatus)} />}
      {result.error && <MenuBarExtra.Item title="Could not refresh Meals" subtitle={result.error.message} />}
      <MenuBarExtra.Item title="My Meals" onAction={() => openMealsCommand("my-meals")} />
      <MenuBarExtra.Item title="Plan My Meals" onAction={() => openMealsCommand("plan-my-meals")} />
    </MenuBarExtra>
  );
}
