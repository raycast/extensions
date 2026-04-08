import { useEffect, useMemo, useState } from "react";

import { type Skill, getOwner } from "../shared";

export function buildOwnerCounts(allSkills: Skill[]) {
  const counts = new Map<string, number>();
  for (const skill of allSkills) {
    const owner = getOwner(skill);
    counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  return new Map([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function filterSkillsByOwner(allSkills: Skill[], owner: string) {
  return owner === "all" ? allSkills : allSkills.filter((skill) => getOwner(skill) === owner);
}

export function resolveOwnerSelection(owner: string, ownerCounts: Map<string, number>) {
  return owner !== "all" && !ownerCounts.has(owner) ? "all" : owner;
}

export function useOwnerFilter(allSkills: Skill[]) {
  const [owner, setOwner] = useState("all");

  const ownerCounts = useMemo(() => buildOwnerCounts(allSkills), [allSkills]);

  // Reset filter when the selected owner is no longer in the results
  useEffect(() => {
    const nextOwner = resolveOwnerSelection(owner, ownerCounts);
    if (nextOwner !== owner) {
      setOwner(nextOwner);
    }
  }, [owner, ownerCounts]);

  const skills = filterSkillsByOwner(allSkills, owner);

  return { owner, setOwner, ownerCounts, skills };
}
