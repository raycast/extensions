import { AI } from "@raycast/api";

type Input = {
  query: string;
};

type DiagramResponse = {
  imageURL: string;
  fileURL: string;
};

export default async function (input: Input) {
  // First, determine the diagram type and request Mermaid-only output for reliable preview
  const userQuery = typeof input?.query === "string" ? input.query : "";
  const diagramAnalysis = await AI.ask(
    `Analyze this request and choose the best diagram type: "${userQuery}"

Choose EXACTLY one type from: FLOWCHART, MINDMAP, SEQUENCE.
Then output ONLY Mermaid for that type:

- FLOWCHART => start with "flowchart TD" or "flowchart LR"
- MINDMAP   => start with "mindmap" then the tree
- SEQUENCE  => start with "sequenceDiagram"

Respond with this exact format and nothing else:
TYPE: [FLOWCHART|MINDMAP|SEQUENCE]
\`\`\`mermaid
<mermaid code here>
\`\`\`
`,
  );

  // Parse the AI response to extract type and Mermaid fenced block
  const typeRe = /TYPE:\s*(FLOWCHART|MINDMAP|SEQUENCE)/i;
  const fenceRe = /```mermaid\s*([\s\S]*?)\s*```/i;
  const typeMatch = typeRe.exec(diagramAnalysis);
  const fenceMatch = fenceRe.exec(diagramAnalysis);

  if (!typeMatch || !fenceMatch) {
    throw new Error("Could not parse diagram type or Mermaid content");
  }

  const diagramType = typeMatch[1].toUpperCase();
  const mermaidFromAI = fenceMatch[1].trim();
  // Mermaid for preview is directly what we got from AI
  const mermaid = mermaidFromAI;

  // Converters: Mermaid -> API content for mindmap/sequence
  const safeTitle = userQuery && userQuery.length > 0 ? userQuery.slice(0, 50) : "Diagram";

  const mermaidToSequenceText = (mm: string) => {
    const ls = mm.split("\n").map((l) => l.trim());
    const out: string[] = [];
    for (const l of ls) {
      if (/^sequenceDiagram/i.test(l) || /^participant\s+/i.test(l) || l === "") continue;
      const m1 = /(\S+)\s*-+>{1,2}\s*(\S+)\s*:\s*(.+)/.exec(l);
      if (m1) out.push(`${m1[1]} -> ${m1[2]}: ${m1[3]}`);
    }
    return out.join("\n");
  };

  const mermaidToMindmapMarkdown = (mm: string) => {
    const lines = mm.split("\n");
    const out: string[] = [];
    let seenMindmap = false;
    for (const rawLine of lines) {
      const line = rawLine.replace(/\t/g, "  ");
      if (!seenMindmap) {
        if (/^\s*mindmap\s*$/i.test(line)) {
          seenMindmap = true;
        }
        continue;
      }
      if (!line.trim()) continue;
      const m = /^(\s*)(.+)$/.exec(line);
      if (!m) continue;
      const indent = Math.floor((m[1] || "").length / 2);
      const text = m[2].trim();
      out.push(`${"  ".repeat(indent)}- ${text}`);
    }
    if (out.length === 0) {
      return `- ${safeTitle}`;
    }
    return out.join("\n");
  };

  // Call the appropriate Whimsical API based on diagram type
  let apiEndpoint: string;
  let requestBody: object;
  switch (diagramType) {
    case "FLOWCHART": {
      apiEndpoint = "https://whimsical.com/api/ai.chatgpt.render-flowchart";
      requestBody = { mermaid: mermaidFromAI, title: safeTitle };
      break;
    }
    case "MINDMAP": {
      apiEndpoint = "https://whimsical.com/api/ai.chatgpt.render-mindmap";
      const markdown = mermaidToMindmapMarkdown(mermaidFromAI);
      requestBody = { markdown, title: safeTitle };
      break;
    }
    case "SEQUENCE": {
      apiEndpoint = "https://whimsical.com/api/ai.chatgpt.render-sequence-diagram";
      const diagramText = mermaidToSequenceText(mermaidFromAI);
      requestBody = { diagram: diagramText, title: safeTitle };
      break;
    }
    default: {
      throw new Error(`Unknown diagram type: ${diagramType}`);
    }
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
  const summaryPrompt = `Briefly summarize what was created in this ${diagramType.toLowerCase()}: "${userQuery}"

Write a single sentence describing the main content/purpose of the diagram. Keep it concise and informative.

Examples:
- "A flowchart showing the user authentication process with login validation steps."
- "A mindmap exploring digital marketing strategies and their key components."
- "A sequence diagram illustrating the API interaction flow for order processing."

Return only the summary sentence, no additional text.`;

  const summary = await AI.ask(summaryPrompt);

  const message = `✨ **${diagramTypeDisplay} Generated**\n\n${summary}\n\n🔗 **Diagram URL:** ${fileURL}`;

  return {
    content: [
      { type: "text", text: message },
      // Mermaid preview in Raycast (rendered from a code fence)
      { type: "text", text: ["## Mermaid preview", "", "```mermaid", mermaid, "```"].join("\n") },
      { type: "resource", resource: { uri: fileURL, text: "Open in Whimsical" } },
    ],
  };
}
