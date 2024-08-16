import { getScoresArray } from "./format_scores";
import { MenuBarExtra, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const { isLoading, data } = usePromise(async () => {
    const response = await getScoresArray();
    const result = await response;
    return result;
  });
  if (!isLoading) {
    // console.log(isLoading)
  }
  return (
    <MenuBarExtra icon={"basketball_logo.png"}>
      <MenuBarExtra.Section title="Live Scores">
        {data?.map((score) => (
          <MenuBarExtra.Item
            key={score.link}
            title={score.shortName + "\n" + score.score + score.status}
            onAction={() => open(score.link)}
          />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
