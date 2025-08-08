import { AI } from "@raycast/api";

type Input = {
  query: string;
};

type DiagramResponse = {
  imageURL: string;
  fileURL: string;
};

export default async function (input: Input) {
  // First, determine the diagram type and generate appropriate content
  const diagramAnalysis = await AI.ask(
    `Analyze this request and determine the best diagram type: "${input.query}"

Choose ONE of these types and generate the appropriate content:

1. FLOWCHART - For processes, workflows, decision trees, step-by-step procedures
   Generate Mermaid flowchart syntax starting with "flowchart TD" or "flowchart LR"

2. MINDMAP - For brainstorming, topics, hierarchical information, concept organization  
   Generate markdown outline with bullet points and proper indentation

3. SEQUENCE - For system interactions, API flows, communication between entities
   Generate sequence description with "Actor -> System: Message" format

Respond with this exact format:
TYPE: [FLOWCHART|MINDMAP|SEQUENCE]
CONTENT: [the generated content for that diagram type]

Be specific and detailed in the content generation.`,
  );

  // Parse the AI response to extract type and content
  const typeMatch = diagramAnalysis.match(/TYPE:\s*(FLOWCHART|MINDMAP|SEQUENCE)/i);
  const contentMatch = diagramAnalysis.match(/CONTENT:\s*([\s\S]*)/i);

  if (!typeMatch || !contentMatch) {
    throw new Error("Could not determine diagram type or generate content");
  }

  const diagramType = typeMatch[1].toUpperCase();
  const content = contentMatch[1].trim();

  // Call the appropriate Whimsical API based on diagram type
  let apiEndpoint: string;
  let requestBody: object;

  switch (diagramType) {
    case "FLOWCHART":
      apiEndpoint = "https://whimsical.com/api/ai.chatgpt.render-flowchart";
      requestBody = { mermaid: content, title: input.query.slice(0, 50) };
      break;
    case "MINDMAP":
      apiEndpoint = "https://whimsical.com/api/ai.chatgpt.render-mindmap";
      requestBody = { markdown: content, title: input.query.slice(0, 50) };
      break;
    case "SEQUENCE":
      apiEndpoint = "https://whimsical.com/api/ai.chatgpt.render-sequence-diagram";
      requestBody = { diagram: content, title: input.query.slice(0, 50) };
      break;
    default:
      throw new Error(`Unknown diagram type: ${diagramType}`);
  }

  const res = await fetch(apiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.statusText}`);
  }

  const { fileURL } = (await res.json()) as DiagramResponse;

  // Create consistent message based on diagram type
  const diagramTypeDisplay =
    {
      FLOWCHART: "Flowchart",
      MINDMAP: "Mindmap",
      SEQUENCE: "Sequence Diagram",
    }[diagramType] || "Diagram";

  // Generate a brief summary of what was created
  const summaryPrompt = `Briefly summarize what was created in this ${diagramType.toLowerCase()}: "${input.query}"

Write a single sentence describing the main content/purpose of the diagram. Keep it concise and informative.

Examples:
- "A flowchart showing the user authentication process with login validation steps."
- "A mindmap exploring digital marketing strategies and their key components."  
- "A sequence diagram illustrating the API interaction flow for order processing."

Return only the summary sentence, no additional text.`;

  const summary = await AI.ask(summaryPrompt);

  const message = `✨ **${diagramTypeDisplay} Generated**

${summary}

🔗 **View your diagram:** [${fileURL}](${fileURL})

Click the link above to view and edit your diagram in Whimsical.`;

  return {
    content: [
      { type: "text", text: message },
      { type: "resource", resource: { uri: fileURL, text: "Open in Whimsical" } },
    ],
  };
}
