import { useEffect, useMemo, useState } from "react";

import { type Skill, getOwner } from "../shared";

export function useOwnerFilter(allSkills: Skill[]) {
  const [owner, setOwner] = useState("all");

  const ownerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const skill of allSkills) {
      const o = getOwner(skill);
      counts.set(o, (counts.get(o) ?? 0) + 1);
    }
    return new Map([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }, [allSkills]);

  // Reset filter when the selected owner is no longer in the results
  useEffect(() => {
    if (owner !== "all" && !ownerCounts.has(owner)) {
      setOwner("all");
    }
  }, [owner, ownerCounts]);

  const skills = owner === "all" ? allSkills : allSkills.filter((skill) => getOwner(skill) === owner);

  return { owner, setOwner, ownerCounts, skills };
}
