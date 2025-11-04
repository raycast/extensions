import { AI } from "@raycast/api";
import { showToast, Toast, Clipboard } from "@raycast/api";
import fs from "fs/promises";
import path from "path";

export interface TextToResumeInput {
  text: string;
  outputPath?: string;
}

/**
 * Detects if the input text contains enough information for a full resume
 * or just a specific section
 */
function detectResumeScope(text: string): "full" | "section" {
  const lowerText = text.toLowerCase();

  // Count how many major resume sections are present
  const sectionKeywords = ["education", "experience", "work", "skills", "projects", "contact", "summary", "objective"];

  const foundSections = sectionKeywords.filter((keyword) => lowerText.includes(keyword)).length;

  // If we find 3 or more sections, treat as full resume
  // Otherwise, treat as a section
  return foundSections >= 3 ? "full" : "section";
}

/**
 * Generate appropriate prompt based on scope
 */
function generatePrompt(text: string, scope: "full" | "section"): string {
  const baseInstructions = `Important instructions (follow exactly):
1) Return ONLY a single JSON object. Do NOT add any surrounding text, comments, or markdown.
2) Use ISO 8601 date format (YYYY-MM-DD) for all dates. If only month/year are present, use YYYY-MM-01.
3) If you cannot determine an exact date, estimate conservatively (e.g. use the first day of the month) and add no explanatory text in the response.
4) Extract all relevant information from the text and structure it properly.`;

  if (scope === "full") {
    return `Convert the following text into a valid JSON Resume schema (https://jsonresume.org/schema/).

Text to convert:
${text}

${baseInstructions}

Return a complete JSON Resume object with these sections as applicable:
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

Education-specific guidance:
- Each entry in "education" must be an object with these fields when available: institution, area, studyType, startDate, endDate, score, courses (array of course names).
- If the input shows a line like:
  ## Education\\n  **Bachelor of Science in Computer Science**  \\n  University of Washington, Seattle, WA | Graduated: June 2017  \\n  GPA: 3.7/4.0 | Dean's List (4 quarters)
  Then map it to JSON like this example (this MUST be followed for education formatting):

  "education": [
    {
      "institution": "University of Washington",
      "area": "Computer Science",
      "studyType": "Bachelor of Science",
      "startDate": "2013-09-01",
      "endDate": "2017-06-01",
      "score": "3.7/4.0",
      "courses": [],
      "summary": "Dean's List (4 quarters)"
    }
  ]

For ambiguous fields (for example a single line that contains institution and location), try to split by commas and pipes and prefer putting the university name into "institution" and the rest into "location" or "summary" if no explicit field exists.

Return only the JSON object; do not include any extra text.`;
  } else {
    return `Convert the following text into a JSON Resume section fragment (https://jsonresume.org/schema/).

Text to convert:
${text}

${baseInstructions}

Analyze the text and determine which JSON Resume section it represents, then return ONLY that section as a JSON object.

Possible sections and their structures:
- If EDUCATION: Return {"education": [array of education objects]}
- If WORK/EXPERIENCE: Return {"work": [array of work objects]}
- If SKILLS: Return {"skills": [array of skill objects]}
- If PROJECTS: Return {"projects": [array of project objects]}
- If VOLUNTEER: Return {"volunteer": [array of volunteer objects]}
- If AWARDS: Return {"awards": [array of award objects]}
- If CERTIFICATES: Return {"certificates": [array of certificate objects]}
- If PUBLICATIONS: Return {"publications": [array of publication objects]}
- If LANGUAGES: Return {"languages": [array of language objects]}
- If INTERESTS: Return {"interests": [array of interest objects]}
- If REFERENCES: Return {"references": [array of reference objects]}
- If BASICS/CONTACT: Return {"basics": {basics object}}

Education format example:
{
  "education": [
    {
      "institution": "University of Washington",
      "area": "Computer Science",
      "studyType": "Bachelor of Science",
      "startDate": "2013-09-01",
      "endDate": "2017-06-01",
      "score": "3.7/4.0",
      "courses": [],
      "summary": "Dean's List (4 quarters)"
    }
  ]
}

Work format example:
{
  "work": [
    {
      "company": "Acme Corp",
      "position": "Software Engineer",
      "website": "https://acme.com",
      "startDate": "2020-01-01",
      "endDate": "2023-12-31",
      "summary": "Led development of key features",
      "highlights": [
        "Improved performance by 50%",
        "Mentored 3 junior developers"
      ]
    }
  ]
}

Return only the JSON object with the appropriate section; do not include any extra text.`;
  }
}

export default async function textToResume(input: TextToResumeInput): Promise<string> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Converting text to JSON Resume...",
  });

  try {
    // Detect if this is a full resume or just a section
    const scope = detectResumeScope(input.text);
    const prompt = generatePrompt(input.text, scope);

    toast.message = scope === "full" ? "Generating full resume..." : "Generating resume section...";

    const result = await AI.ask(prompt, {
      model: AI.Model["OpenAI_GPT5-mini"],
    });

    // Clean up the result to ensure it's valid JSON
    let cleanedResult = result.trim();

    // Remove markdown code blocks if present
    if (cleanedResult.startsWith("```")) {
      cleanedResult = cleanedResult.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    // Validate JSON
    let jsonResume;
    try {
      jsonResume = JSON.parse(cleanedResult);
    } catch (parseError) {
      throw new Error(`Failed to parse AI response as JSON: ${parseError}`);
    }

    // Pretty print the JSON
    const formattedJson = JSON.stringify(jsonResume, null, 2);

    // Save to file if output path is provided
    if (input.outputPath) {
      const fullPath = path.resolve(input.outputPath);
      await fs.writeFile(fullPath, formattedJson, "utf-8");
      toast.style = Toast.Style.Success;
      toast.title = scope === "full" ? "Full resume created!" : "Resume section created!";
      toast.message = `Saved to ${fullPath}`;
    } else {
      // Copy to clipboard if no output path
      await Clipboard.copy(formattedJson);
      toast.style = Toast.Style.Success;
      toast.title = scope === "full" ? "Full resume generated!" : "Resume section generated!";
      toast.message = "Copied to clipboard";
    }

    return formattedJson;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to convert text";
    toast.message = error instanceof Error ? error.message : "Unknown error";
    throw error;
  }
}
