import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import LawListItem from "./components/LawListItem";
import { LAWS } from "./constants";

export default function Command() {
  const [pinnedLaws, setPinnedLaws] = useCachedState<string[]>("pinnedLaws", []);

  const unpinnedLaws = LAWS.filter((law) => !pinnedLaws.includes(law.fullNumber));

  const handleMoveUpInPinned = (lawNumber: string) => {
    setPinnedLaws((prevPinnedLaws) => {
      const index = prevPinnedLaws.indexOf(lawNumber);
      if (index > 0) {
        const newPinnedLaws = [...prevPinnedLaws];
        [newPinnedLaws[index - 1], newPinnedLaws[index]] = [newPinnedLaws[index], newPinnedLaws[index - 1]];
        return newPinnedLaws;
      }
      return prevPinnedLaws;
    });
  };

  const handleMoveDownInPinned = (lawNumber: string) => {
    setPinnedLaws((prevPinnedLaws) => {
      const index = prevPinnedLaws.indexOf(lawNumber);
      if (index < prevPinnedLaws.length - 1) {
        const newPinnedLaws = [...prevPinnedLaws];
        [newPinnedLaws[index], newPinnedLaws[index + 1]] = [newPinnedLaws[index + 1], newPinnedLaws[index]];
        return newPinnedLaws;
      }
      return prevPinnedLaws;
    });
  };

  return (
    <List searchBarPlaceholder="Search law">
      {pinnedLaws.length > 0 && (
        <List.Section title="Pinned">
          {pinnedLaws.map((lawNumber) => {
            const law = LAWS.find((law) => law.fullNumber === lawNumber);
            return (
              law && (
                <LawListItem
                  key={law.fullNumber}
                  law={law}
                  isPinned={true}
                  pinnedLaws={pinnedLaws}
                  onTogglePin={setPinnedLaws}
                  onMoveUpInPinned={handleMoveUpInPinned}
                  onMoveDownInPinned={handleMoveDownInPinned}
                />
              )
            );
          })}
        </List.Section>
      )}
      <List.Section title="Laws">
        {unpinnedLaws.map((law) => (
          <LawListItem
            key={law.fullNumber}
            law={law}
            isPinned={false}
            pinnedLaws={pinnedLaws}
            onTogglePin={setPinnedLaws}
            onMoveUpInPinned={handleMoveUpInPinned}
            onMoveDownInPinned={handleMoveDownInPinned}
          />
        ))}
      </List.Section>
    </List>
  );
}
