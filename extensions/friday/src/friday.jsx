import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, LocalStorage, Detail } from "@raycast/api";
import { Composio, AuthScheme } from "@composio/core";
import { OpenAIProvider } from "@composio/openai";
import { OpenAI } from "openai";
import { v4 as uuidv4 } from "uuid";
import { useState } from "react";

/**
 * Retrieves a stable unique user ID from LocalStorage.
 * If one doesn't exist, it creates and saves a new one.
 */
async function getPersistentUserId() {
  const storedId = await LocalStorage.getItem("composioUserId");
  if (storedId) {
    return storedId;
  }

  const newId = uuidv4();
  await LocalStorage.setItem("composioUserId", newId);
  return newId;
}

/**
 * Ensures connections for all available toolkits
 */
async function ensureConnections(composio, userId, toolkits, toast, tavilyApiKey, tavilyAuthConfigId) {
  const response = await composio.connectedAccounts.list({
    userIds: [userId],
  });

  const connectedToolkits = response.items
    .filter((account) => account.status === "ACTIVE")
    .map((account) => account.toolkit?.slug?.toUpperCase())
    .filter(Boolean);

  const missingToolkits = toolkits.filter((toolkit) => !connectedToolkits.includes(toolkit.toUpperCase()));

  if (missingToolkits.length > 0) {
    toast.message = `Some tools need authorization: ${missingToolkits.join(", ")}`;

    for (const missingToolkit of missingToolkits) {
      try {
        toast.message = `Authorizing ${missingToolkit}...`;

        // Handle different authentication types
        if (missingToolkit.toUpperCase() === "TAVILY") {
          // API Key authentication for Tavily
          if (!tavilyApiKey) {
            throw new Error("Tavily API key is required. Please add it to your preferences.");
          }
          if (!tavilyAuthConfigId) {
            throw new Error("Tavily auth config ID is required. Please add it to your preferences.");
          }

          const connectionRequest = await composio.connectedAccounts.initiate(
            userId,
            tavilyAuthConfigId, // Use the actual auth config ID from dashboard
            {
              config: AuthScheme.APIKey({
                api_key: tavilyApiKey,
              }),
            },
          );

          console.log(`Tavily connected with status: ${connectionRequest.status}`);
        } else {
          // OAuth authentication for other services
          const connection = await composio.toolkits.authorize(userId, missingToolkit);

          if (connection.redirectUrl) {
            await import("@raycast/api").then(({ open }) => open(connection.redirectUrl));
            toast.message = `Please complete ${missingToolkit} authorization in browser...`;
            await connection.waitForConnection();
          }
        }
      } catch (error) {
        console.warn(`Failed to authorize ${missingToolkit}:`, error);
        throw error; // Re-throw for Tavily since API key is required
      }
    }
  }

  return connectedToolkits.concat(missingToolkits);
}

/**
 * Gets available tools from all connected toolkits
 */
async function getAllAvailableTools(composio, userId, availableToolkits) {
  const allTools = [];

  for (const toolkit of availableToolkits) {
    try {
      const tools = await composio.tools.get(userId, {
        toolkits: [toolkit],
        limit: 10, // Limit per toolkit to avoid overwhelming the LLM
      });
      allTools.push(...tools);
    } catch (error) {
      console.warn(`Failed to get tools for ${toolkit}:`, error);
      // Continue with other toolkits
    }
  }

  return allTools;
}

/**
 * Extracts and formats the actual response from tool execution results
 */
function extractToolResponse(result) {
  try {
    if (Array.isArray(result) && result.length > 0) {
      const toolResult = result[0];

      if (toolResult.content) {
        // Parse the content if it's a JSON string
        let content;
        try {
          content = typeof toolResult.content === "string" ? JSON.parse(toolResult.content) : toolResult.content;
        } catch {
          content = { raw: toolResult.content };
        }

        // Handle different tool responses
        if (content?.data?.response_data) {
          const responseData = content.data.response_data;

          // Tavily search results
          if (responseData.answer) {
            return responseData.answer;
          }

          // Google Calendar event creation
          if (responseData.summary && responseData.start && responseData.end) {
            const startTime = new Date(responseData.start.dateTime).toLocaleString();
            const endTime = new Date(responseData.end.dateTime).toLocaleString();
            const attendees = responseData.attendees?.map((a) => a.email).join(", ") || "No attendees";

            return `✅ **Meeting Created Successfully!**

**Title:** ${responseData.summary}
**Start:** ${startTime}
**End:** ${endTime}
**Attendees:** ${attendees}
**Status:** ${responseData.status}

📅 [View in Google Calendar](${responseData.htmlLink})`;
          }

          // Gmail send response
          if (responseData.id && responseData.threadId) {
            const labels = responseData.labelIds?.join(", ") || "None";
            return `✅ **Email Sent Successfully!**

**Message ID:** ${responseData.id}
**Thread ID:** ${responseData.threadId}
**Labels:** ${labels}`;
          }

          // GitHub issue creation
          if (responseData.number && responseData.title) {
            return `✅ **GitHub Issue Created Successfully!**

**Issue #${responseData.number}:** ${responseData.title}
**Status:** ${responseData.state}
**URL:** ${responseData.html_url}`;
          }

          // Twitter/X post
          if (responseData.data?.id) {
            return `✅ **Tweet Posted Successfully!**

**Tweet ID:** ${responseData.data.id}
**Text:** ${responseData.data.text}`;
          }

          // Notion page creation
          if (responseData.id && responseData.properties) {
            const title = responseData.properties?.title?.title?.[0]?.plain_text || "Untitled";
            return `✅ **Notion Page Created Successfully!**

**Title:** ${title}
**ID:** ${responseData.id}
**URL:** ${responseData.url}`;
          }

          // Generic search results (like Tavily results array)
          if (responseData.results && Array.isArray(responseData.results)) {
            return responseData.results
              .map((r, index) => `**Result ${index + 1}:**\n${r.content?.substring(0, 300)}...`)
              .join("\n\n");
          }
        }

        // Check if it's a successful operation
        if (content?.successful === true || content?.error === null) {
          return `✅ **Task completed successfully!**\n\n${JSON.stringify(content.data?.response_data || content, null, 2)}`;
        }

        // Fallback to raw content
        return typeof content === "string" ? content : JSON.stringify(content, null, 2);
      }
    }

    return "Task completed successfully, but no detailed response was returned.";
  } catch (error) {
    console.error("Error extracting tool response:", error);
    return "Task completed, but there was an issue displaying the response.";
  }
}

export default function Command() {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values) {
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Initializing..." });

    try {
      const { composioApiKey, openaiApiKey, tavilyApiKey, tavilyAuthConfigId } = getPreferenceValues();
      const { prompt } = values;

      if (!prompt) {
        toast.style = Toast.Style.Failure;
        toast.title = "Prompt is required";
        setIsLoading(false);
        return;
      }

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: openaiApiKey,
      });

      // Initialize Composio with OpenAI provider
      const composio = new Composio({
        apiKey: composioApiKey,
        provider: new OpenAIProvider(),
      });

      const userId = await getPersistentUserId();

      // Available toolkits for the MVP
      const availableToolkits = ["GMAIL", "GITHUB", "NOTION", "GOOGLECALENDAR", "TAVILY", "TWITTER"];

      toast.message = "Checking connections...";

      // Ensure we have connections (will only auth if needed)
      const connectedToolkits = await ensureConnections(
        composio,
        userId,
        availableToolkits,
        toast,
        tavilyApiKey,
        tavilyAuthConfigId,
      );

      toast.message = "Loading available tools...";

      // Get all available tools from connected toolkits
      const allTools = await getAllAvailableTools(composio, userId, connectedToolkits);

      if (allTools.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "No tools available";
        toast.message = "Please ensure at least one integration is connected.";
        setIsLoading(false);
        return;
      }

      toast.message = `🤖 AI analyzing prompt with ${allTools.length} available tools...`;

      // Get current date info
      const now = new Date();
      const currentDate = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const currentTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });

      // Let the AI choose the appropriate tools and execute
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant with access to various productivity tools. 
            
            IMPORTANT: Today's date is ${currentDate} and the current time is ${currentTime}.
            When scheduling meetings or events, ALWAYS use dates from 2025 or later. 
            If the user says "tomorrow", that means ${new Date(now.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString(
              "en-US",
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              },
            )}.
            
            Analyze the user's request and automatically choose the most appropriate tool(s) to accomplish their task.
            
            Available capabilities:
            - Gmail: Send emails, read emails, manage inbox
            - GitHub: Create issues, manage repositories, code management
            - Notion: Note-taking, documentation, knowledge management
            - Google Calendar: Schedule meetings, manage events, check availability
            - Tavily: Web search, research, find current information
            - Twitter: Post tweets, social media management
            
            For Google Calendar events:
            - Always use the correct year (2025 or later)
            - Use proper ISO 8601 datetime format
            - Include timezone information
            - Validate that start time is before end time
            
            Choose and execute the most relevant tool(s) based on the user's request.
            After executing tools, provide a clear summary of what you found or accomplished.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        tools: allTools,
      });

      toast.message = "Executing action...";

      // Handle tool calls with Composio
      const toolResult = await composio.provider.handleToolCalls(userId, completion);

      // Extract the actual response from tool execution
      const toolResponse = extractToolResponse(toolResult);

      // Get the assistant's response or use the tool response
      let finalResponse = completion.choices[0]?.message?.content || "";

      // If we have tool results, include them
      if (toolResponse && toolResponse !== "Task completed successfully, but no detailed response was returned.") {
        finalResponse = toolResponse;
      }

      // Set the result to display
      setResult(finalResponse || "Task completed successfully!");

      toast.style = Toast.Style.Success;
      toast.title = "Task Completed!";
      toast.message = "Check the results below";

      // Log the result for debugging
      console.log("Tool execution result:", JSON.stringify(toolResult, null, 2));
    } catch (error) {
      console.error("Error details:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "An error occurred";
      toast.message = error instanceof Error ? error.message : "Please check your API keys and try again.";
    } finally {
      setIsLoading(false);
    }
  }

  // Show results view if we have results
  if (result) {
    return (
      <Detail
        markdown={`# Task Result\n\n${result}`}
        actions={
          <ActionPanel>
            <Action
              title="Run Another Task"
              onAction={() => {
                setResult(null);
              }}
            />
            <Action.CopyToClipboard title="Copy Result" content={result} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Execute" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Describe what you want to accomplish, and the AI will automatically choose and execute the best tools." />
      <Form.TextArea
        id="prompt"
        title="What would you like to do?"
        placeholder="Examples:
• Schedule a meeting with John for tomorrow at 2pm
• Search for the latest AI news and tweet a summary
• Create a GitHub issue for the login bug
• Send an email to the team about the project update
• Add a task to track the new feature development"
        storeValue={!isLoading} // Don't store value while loading
      />
      {isLoading && <Form.Description text="🤖 Processing your request..." />}
    </Form>
  );
}
