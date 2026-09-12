import { findSkills } from "../lib/api";

type Input = {
  /** The skill the user named, or their words for what they asked to load. */
  query: string;
};

export default async function loadSkill(input: Input) {
  const { matches } = await findSkills(input.query, 5);

  // Official matches are Val Town's platform guides, which are not the user's skills.
  const personal = (matches ?? []).filter((skill) => skill.source === "personal");

  if (personal.length === 0) {
    return {
      skills: [],
      note: `No skill of the user's own matched "${input.query}". Do not substitute a Val Town platform guide.`,
    };
  }

  return {
    skills: personal.map((skill) => ({
      name: skill.name,
      description: skill.description,
      instructions: skill.content,
    })),
    note: "Follow the loaded skill's instructions. Any val it names is run with execute-tool, which only reaches vals the user has enabled.",
  };
}
