import { Tool, AI, showToast, Toast } from "@raycast/api";
import { validateResume } from "../utils/validateResume";
import { saveResume } from "../utils/storage";

/**
 * Input type for the text-to-resume tool
 */
type TextToResumeInput = {
  /**
   * The text content to convert into a JSON Resume schema
   */
  text: string;
  /**
   * Optional title for the generated resume
   */
  title?: string;
};

/**
 * Confirmation handler that shows what will be converted
 */
export const confirmation: Tool.Confirmation<TextToResumeInput> = async (input) => {
  const textPreview = input.text.substring(0, 200) + (input.text.length > 200 ? "..." : "");

  return {
    message: "Are you sure you want to convert this text to a JSON Resume?",
    info: [
      {
        name: "Text Preview",
        value: textPreview,
      },
      {
        name: "Title",
        value: input.title || "Untitled Resume",
      },
      {
        name: "Text Length",
        value: `${input.text.length} characters`,
      },
    ],
  };
};

/**
 * Main tool handler that converts text to JSON Resume format
 */
export default async function textToResume(input: TextToResumeInput): Promise<string> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Converting text to resume...",
  });

  try {
    // Use AI to convert the text to JSON Resume format
    const prompt = `Convert the following text into a valid JSON Resume schema (https://jsonresume.org/schema/).
    
Text to convert:
${input.text}

Please return ONLY a valid JSON object following the JSON Resume schema with these main sections:
- basics (name, label, image, email, phone, url, summary, location, profiles)
- work (company, position, website, startDate, endDate, summary, highlights)
- volunteer
- education (institution, area, studyType, startDate, endDate, score, courses)
- awards
- certificates
- publications
- skills (name, level, keywords)
- languages
- interests
- references
- projects

Extract all relevant information from the text and structure it properly. Use ISO 8601 date format (YYYY-MM-DD) for dates.
Return ONLY the JSON object, no additional text or markdown.`;

    const result = await AI.ask(prompt, {
      model: AI.Model["OpenAI_GPT5-mini"],
    });

    // Clean up the response - remove markdown code blocks if present
    let jsonString = result.trim();
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    // Parse and validate the JSON
    let resume: unknown;
    try {
      resume = JSON.parse(jsonString);
    } catch (parseError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to parse generated JSON";
      toast.message = parseError instanceof Error ? parseError.message : "Invalid JSON format";
      return `Error: Could not parse the generated JSON. Please try again with clearer text.`;
    }

    // Validate against JSON Resume schema
    const validation = await validateResume(resume);

    if (!validation.valid) {
      toast.style = Toast.Style.Failure;
      toast.title = "Generated resume failed validation";
      toast.message = "The AI-generated resume doesn't match the JSON Resume schema";

      // Still return the JSON for inspection
      return `Warning: The generated resume may not be fully valid:\n\n${JSON.stringify(resume, null, 2)}\n\nValidation error: ${validation.error}`;
    }

    // Save the resume to local storage
    const resumeData = JSON.stringify(resume, null, 2);
    const dataUrl = `data:application/json;base64,${Buffer.from(resumeData).toString("base64")}`;

    await saveResume(dataUrl, input.title || "AI Generated Resume");

    toast.style = Toast.Style.Success;
    toast.title = "Resume converted successfully!";
    toast.message = "The resume has been saved to your collection";

    // Return the formatted JSON
    return `Successfully converted text to JSON Resume:\n\n${resumeData}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Conversion failed";
    toast.message = error instanceof Error ? error.message : "Unknown error occurred";

    throw error;
  }
}
