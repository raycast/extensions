import { useEffect, useMemo, useState } from "react";

import { type Skill, getCompany } from "../shared";

export function useCompanyFilter(allSkills: Skill[]) {
  const [company, setCompany] = useState("all");

  const companyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of allSkills) {
      const c = getCompany(s);
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return new Map([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }, [allSkills]);

  // Reset filter when the selected company is no longer in the results
  useEffect(() => {
    if (company !== "all" && !companyCounts.has(company)) {
      setCompany("all");
    }
  }, [company, companyCounts]);

  const skills = company === "all" ? allSkills : allSkills.filter((s) => getCompany(s) === company);

  return { company, setCompany, companyCounts, skills };
}
