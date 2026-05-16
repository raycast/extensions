import { SkillView } from "./components/skill-view";
import { loadSkill } from "./lib/skills";

export default function Command() {
  return <SkillView skill={loadSkill("morning-briefing")} />;
}
