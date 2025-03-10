import { LocalStorage, AI } from "@raycast/api";
import { DifyApp } from "../utils/types";

type Input = {
  /** The name of the Dify application to explain */
  appName: string;
};

/**
 * Find a Dify application by name
 * @param appName Name of the application to find
 * @returns The found application or null if not found
 */
async function findDifyApp(appName: string): Promise<DifyApp | null> {
  // Get application list from local storage
  const appsJson = await LocalStorage.getItem<string>("dify-apps");
  if (!appsJson) return null;

  const apps: DifyApp[] = JSON.parse(appsJson);
  if (!apps || apps.length === 0) return null;

  // Find the app with exact or partial name match
  const searchTerm = appName.toLowerCase();

  // Try exact match first
  const exactMatch = apps.find((app) => app.name.toLowerCase() === searchTerm);
  if (exactMatch) return exactMatch;

  // Try partial match
  const partialMatch = apps.find(
    (app) => app.name.toLowerCase().includes(searchTerm) || searchTerm.includes(app.name.toLowerCase()),
  );

  return partialMatch || null;
}

/**
 * Generate a comprehensive explanation of a Dify application using AI
 * @param app The Dify application to explain
 * @returns Detailed explanation of the application
 */
async function generateAppExplanation(app: DifyApp): Promise<string> {
  try {
    // Create a context with app information for the AI
    const appContext = {
      name: app.name,
      type: app.type,
      endpoint: app.endpoint,
      description: app.description || "No description provided",
      inputs: app.inputs || {},
      responseMode: app.responseMode || "blocking",
      assistantName: app.assistantName,
    };

    // Create the prompt for AI
    const prompt = `
    I need a comprehensive explanation of a Dify application with the following details:
    ${JSON.stringify(appContext, null, 2)}
    
    Please provide:
    1. A clear, concise introduction to what this application does
    2. The main capabilities and use cases of this application
    3. A detailed explanation of the required inputs and how to use them
    4. Any special features or considerations when using this application
    
    Format the response in markdown with appropriate sections and formatting.
    `;

    // Ask AI to generate the explanation
    const explanation = await AI.ask(prompt, {
      creativity: "medium", // We want a balanced explanation that's informative but not overly creative
    });

    return explanation;
  } catch (error) {
    console.error("Error generating AI explanation:", error);

    // Fallback to manual explanation if AI fails
    return generateManualExplanation(app);
  }
}

/**
 * Generate a manual explanation of a Dify application as fallback
 * @param app The Dify application to explain
 * @returns Basic explanation of the application
 */
function generateManualExplanation(app: DifyApp): string {
  // Generate type-specific description
  let typeDescription = "";
  if (app.type.toLowerCase().includes("agent")) {
    typeDescription = "an intelligent agent that can answer questions and perform tasks based on your inputs";
  } else if (app.type.toLowerCase().includes("workflow")) {
    typeDescription = "a workflow application that processes sequential operations based on your inputs";
  } else if (app.type.toLowerCase().includes("generator")) {
    typeDescription = "a text generation application that creates content based on your prompts";
  } else {
    typeDescription = "a Dify application that processes your inputs and provides relevant outputs";
  }

  // Format input requirements
  let inputsDescription = "";
  if (app.inputs && Object.keys(app.inputs).length > 0) {
    inputsDescription = "## Required Inputs\n\n";
    Object.keys(app.inputs).forEach((key) => {
      inputsDescription += `- **${key}**: ${app.inputs[key] || "Your input here"}\n`;
    });
  } else {
    inputsDescription = "## Inputs\n\nThis application doesn't require any specific inputs.";
  }

  // Create the explanation
  return `# ${app.name}

## Overview
${app.description || `${app.name} is ${typeDescription}.`}

## Type
This is a ${app.type} application.

${inputsDescription}

## Usage
To use this application, provide the required inputs and submit your request. The application will process your inputs and return relevant results.

## Technical Details
- **Endpoint**: ${app.endpoint}
- **Response Mode**: ${app.responseMode || "blocking"}
${app.assistantName ? `- **Assistant Name**: ${app.assistantName}` : ""}
`;
}

/**
 * Format example query for the application
 * @param app The Dify application
 * @returns Formatted example query
 */
function formatExampleQuery(app: DifyApp): string {
  // Create example inputs based on app type
  const exampleInputs: Record<string, string> = {};

  if (app.type.toLowerCase().includes("agent")) {
    exampleInputs["query"] = "What is the capital of France?";
  } else if (app.type.toLowerCase().includes("workflow")) {
    exampleInputs["message"] = "Process this workflow request";
  } else if (app.type.toLowerCase().includes("generator")) {
    exampleInputs["message"] = "Generate a creative story about space exploration";
  } else {
    exampleInputs["message"] = "Hello, I need assistance with...";
  }

  // Add any custom inputs from the app
  Object.keys(app.inputs || {}).forEach((key) => {
    if (!exampleInputs[key]) {
      if (key.toLowerCase().includes("query") || key.toLowerCase().includes("question")) {
        exampleInputs[key] = "What is the capital of France?";
      } else if (key.toLowerCase().includes("topic")) {
        exampleInputs[key] = "Space exploration";
      } else if (key.toLowerCase().includes("language") || key.toLowerCase().includes("lang")) {
        exampleInputs[key] = "English";
      } else {
        exampleInputs[key] = `Example ${key}`;
      }
    }
  });

  return JSON.stringify(exampleInputs, null, 2);
}

/**
 * Explain Dify Application AI Tool
 * Provides detailed explanation of a specific Dify application
 */
export default async function explainDifyAppTool(input: Input): Promise<string> {
  console.log("===== EXPLAIN DIFY APP TOOL CALLED =====");
  console.log("App Name:", input.appName);

  try {
    // Check if app name is empty
    if (!input.appName || input.appName.trim() === "") {
      console.log("Empty app name received");
      return JSON.stringify({
        message: "Please provide the name of a Dify application to explain.",
      });
    }

    // Find the specified Dify application
    const app = await findDifyApp(input.appName);

    // If app not found, return error message
    if (!app) {
      console.log(`App not found: ${input.appName}`);
      return JSON.stringify({
        message: `No Dify application found with name "${input.appName}". Please check the name and try again.`,
        found: false,
      });
    }

    console.log(`Found app: ${app.name}`);

    // Generate explanation for the application
    const explanation = await generateAppExplanation(app);

    // Generate example query
    const exampleQuery = formatExampleQuery(app);

    return JSON.stringify({
      message: `Here's an explanation of the Dify application "${app.name}":`,
      app: {
        name: app.name,
        type: app.type,
        endpoint: app.endpoint,
        description: app.description || "No description provided",
        explanation: explanation,
        example_query: exampleQuery,
      },
      found: true,
    });
  } catch (error) {
    console.error("Error in explain-dify-app tool:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify({
      error: errorMessage,
      message: "An error occurred while processing your request.",
    });
  }
}
