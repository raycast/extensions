import { Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { yazio } from "../utils/yazio";

export function DailyProgressDetail({ selectedDate }: { selectedDate: string }) {
  const { isLoading, data, error } = usePromise(
    async (date) => {
      const summary = await yazio.user.getDailySummary({ date });
      return summary;
    },
    [selectedDate],
  );

  if (error) {
    return <Detail markdown={`# Error\n\n${error.message}`} />;
  }

  const consumed = data
    ? Math.round(Object.values(data.meals).reduce((total, meal) => total + meal.nutrients["energy.energy"], 0))
    : 0;

  const goal = data ? Math.round(data.goals["energy.energy"]) : 0;
  const burned = data ? Math.round(data.activity_energy) : 0;
  const remaining = goal > 0 ? goal - consumed + burned : 0;

  const markdownContent = `
# Remaining: ${remaining} calories

---

| Consumed | Goal | Burned |
|:---:|:---:|:---:|
| **${consumed}** | **${goal}** | <font color="#f97316">**${burned}**</font> |
  `;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdownContent}
      navigationTitle={`Progress for ${new Date(selectedDate).toLocaleDateString()}`}
    />
  );
}
