import { SmitherySkill } from "./api/types";
import { searchSkills } from "./api/smithery";
import { SkillListItem } from "./components/skills/SkillListItem";
import { SearchCommand } from "./components/SearchCommand";

function rankSkills(left: SmitherySkill, right: SmitherySkill): number {
  const byActivations =
    (right.totalActivations ?? 0) - (left.totalActivations ?? 0);
  if (byActivations !== 0) {
    return byActivations;
  }

  return (right.qualityScore ?? 0) - (left.qualityScore ?? 0);
}

export default function SearchSkills() {
  return (
    <SearchCommand<SmitherySkill>
      fetchFn={searchSkills}
      rankComparator={rankSkills}
      dedupKey={(skill) => `${skill.namespace}/${skill.slug}`}
      errorLabel="Failed to fetch skills."
      strings={{
        searchBarPlaceholder: "Search Smithery skills...",
        emptyTitlePopular: "No Skills Available",
        emptyTitleSearch: "No Skills Found",
        emptyDescriptionPopular: "Could not load popular skills right now.",
      }}
      renderItem={(skill, isShowingDetail, onToggleDetail) => (
        <SkillListItem
          key={`${skill.namespace}/${skill.slug}`}
          skill={skill}
          isShowingDetail={isShowingDetail}
          onToggleDetail={onToggleDetail}
        />
      )}
    />
  );
}
