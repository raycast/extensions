import { AI, LaunchProps, Detail } from "@raycast/api";
import { useAI } from "@raycast/utils";

export default function SearchWithContext(props: LaunchProps<{ arguments: Arguments.Search }>) {
  const { search } = props.arguments;
  const prompt = `
    Tool Brainstorm

    You are responsible for answering a search query using Context Documents.

    Context Documents are created by users or automatically generated through Tool calls. They are stored as markdown documents in Local Storage. Their purpose is to transform raw directories of codebase content, journal entries, and other files into a context for AI. Context Documents are designed to be used with other AI extensions like GitHub, Linear, Focus, and Google Calendar, to provide dynamic context for AI conversations.

    The concept of Corpora originated from the need to enhance Raycast's Finder AI Extension tools after struggling to integrate my codebase and journal repositories into AI conversations using only natural language. After discussing this with Raycast support, we confirmed it was a limitation of Finder.

    Thanks to Raycast's developer API, I can not only reimplement the tools I need from Finder using Node.js, but I can also create a pipeline on top of raw content before returning it as context to Raycast AI. I can utilize my \`extension.supportPath\` to record my various directories and manage their contexts and steering documents. This allows me to engage in AI conversations, perform tasks, reflect, and update the information using natural language.

    Corpora is my personal AI orchestration system that enhances Raycast Pro's capabilities with dynamic project and AI context management. It is an API for creating your own agentic workflows and context windows.

    Please note that I haven't provided any Context Documents relevant to this query. This is an important step on my roadmap. Use this prompt to answer the following search query:

    ${search}
  `;

  console.log(prompt);

  const { data, isLoading } = useAI(prompt, {
    model: AI.Model["OpenAI_GPT5-nano"],
    creativity: "low",
  });

  return <Detail isLoading={isLoading} markdown={data} />;
}
