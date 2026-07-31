import { homedir } from "node:os";

import { SkillsManager } from "./components/skills-manager";

export default function Command() {
  return <SkillsManager workingDirectory={homedir()} />;
}
