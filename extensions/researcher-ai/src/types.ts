export interface ResearchProject {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "completed";
  currentStep: number;
  model: string;
  researchPrompt: string;
  topicMarkdown?: string;
  topicDisplay?: string;
  parsedTopics?: ParsedTopic[];
  reportContent?: string;
  critiqueContent?: string;
  finalReport?: string;
}

export interface ParsedTopic {
  name: string;
  content: string;
  isPrimary: boolean;
  researchContent?: string;
}

export interface ResearchTopic {
  title: string;
  description: string;
  relevance: number; // 1-10
  subtopics?: string[];
}

export const RESEARCH_STEPS = [
  { title: "Generate Topics", icon: "lightbulb" },
  { title: "Gather Information", icon: "magnifying-glass" },
  { title: "Write Report", icon: "document" },
  { title: "Self-Critique", icon: "stars" },
  { title: "Final Report", icon: "checkmark-circle" },
] as const;
