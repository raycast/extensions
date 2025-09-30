import { AI, LaunchProps, Detail } from "@raycast/api";
import { useAI } from "@raycast/utils";

export default function ExplainExtension(props: LaunchProps<{ arguments: Arguments.ExplainExtension }>) {
  const { question } = props.arguments;
  const prompt = `
  You are responsible for explaining the Extendo Raycast extension to me, the developer.

  Extendo is an opinionated toolbox of hand-crafted ai-powered commands for ai-crazy people. Specifically, Raycast Pro users that pay and milk the Advanced AI models add-on. The idea of Extendo came from wanting to fix Raycast's Finder AI Extension tools after trying to get my codebase and journal repos into my ai conversation with just natural language. After talking to Raycast support, we confirmed it was a Finder limitation.

  But thanks to Raycast's developer API, not only can I reimplement the tools I need from Finder with nodejs, but I can also create my own layer of processing on top of the raw journal and code content before returning back to Raycast AI. I can use my extension.supportPath and record my different directories and manage their contexts and steering documents with my extension to have ai conversations, do work, do some reflection, and update it again with natural language.

  Extendo is my personal AI orchestration system that extends Raycast Pro's capabilities with dynamic project and ai context management. This prompt right now is an input to AI.ask. This command simply invokes Raycast AI with this prompt and returns the results! This prompt was written to be a nice default command as a placeholder and properly help me understand the extension, command, and tools over time. Here's what it does:

  CORE CONCEPT:

  Extendo creates ".ray" directories in project folders (codebases, journals, sandboxes, projects, products) to contain AI-generated steering documents. These documents provide dynamic context to any Raycast AI conversation without cluttering AI Preset system instructions.

  ARCHITECTURE:

  - AI Presets define behavior (how AI acts, thinks, and talks)
    - Intended to be used with other AI extensions like GitHub, Linear, Focus, and Google Calendar
  - Extendo provides context and steering (what AI knows and how AI should steer my projects)
  - Tools provide low-level functionality and automation (read/write files, get/set context, etc.)
    - Raycasst Pro users talk to Raycast AI. Raycast AI either makes a tool call or text generation. The AI Extenson stops when Raycast AI calls it's last text generation.
  - Commands provide UI, interval background scripts, automation on top of tools
    - The first command is this prompt... extendo.tsx rendering a Detail component

  KEY TOOLS:

  - File operations (read/write files - fixing Raycast Finder limitations)
  - get-documents ("Get Documents"): Finds relevant .ray directory of context and support documents
  - upsert-documents ("Upsert Documents"): Updates or creates .ray directory

  KEY COMMANDS:

  - extendo ("Extendo"): This command is the default command and is a placeholder for now. It simply invokes Raycast AI with this prompt and returns the results!
  - create-project ("Create Project"): Creates a new Project in extension.supportPath, a .ray folder at the Project directory, and upserts context based on the project's name, description, and given directory
  - manage-projects ("Manage Projects"): Lists all Projects in extension.supportPath and allows me to go into one to manage

  WORKFLOW:

  1. I talk to Raycast AI in any chat or preset
  2. AI calls get-context to find the best .ray directory
  3. If no .ray dir is fitting, Raycast AI automatically determines to call upsert-context
  4. upsert-context analyzes the directory and uses conversation to create strategic documents
  5. Future AI conversations can use my extension to get and update rich context

  This separates concerns: AI Presets focus on behavior, Extendo provides dynamic context, and existing Raycast extensions (GitHub, Linear, Google Calendar, Focus) handle their respective domains.

  ${
    question
      ? `\n\nUser query: "${question}"\n\nAddress this specific question about Extendo.`
      : `\n\nUse the above information to create an interesting pitch for Extendo.`
  }`;

  console.log(prompt);

  const { data, isLoading } = useAI(prompt, {
    model: AI.Model["Google_Gemini_2.0_Flash"],
    creativity: "low",
  });

  return <Detail isLoading={isLoading} markdown={data} />;
}
