import { MenuBarExtra, open } from "@raycast/api";
import { useScores } from ".";

export default function ScoresMenuBar() {
  const { isLoading, data } = useScores();

  return (
    <MenuBarExtra icon="command-icon.png" isLoading={isLoading}>
      {data.map((match) => (
        <MenuBarExtra.Item
          key={match.id}
          icon={match.icon}
          title={match.title}
          subtitle={match.summary}
          onAction={() => open(match.link)}
        />
      ))}
    </MenuBarExtra>
  );
}
