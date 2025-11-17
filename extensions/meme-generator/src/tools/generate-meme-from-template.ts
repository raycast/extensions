import { generateMeme } from "../api";

/**
 * Generates a meme using a specific template ID and text for its boxes.
 * Calls the Imgflip API to create the meme image.
 * Returns the URL of the generated meme image or an error object.
 */
// Define as a standard async function with explicit input and return types
async function generateMemeFromTemplate(
  input: { template_id: string; boxes: { text: string }[] }, // Input type
): Promise<{ url: string } | { error: string }> {
  // Return type (includes error case)
  console.log("generate-meme-from-template received input:", JSON.stringify(input, null, 2));

  // Validate the necessary input data directly from the input object
  if (!input || typeof input.template_id !== "string" || !Array.isArray(input.boxes)) {
    console.log("Validation failed: Missing or invalid template_id or boxes in direct input");
    return { error: "Invalid input: Missing template ID or text boxes." };
  }

  const templateId = input.template_id;
  const boxes = input.boxes;

  console.log(`Validation passed. Template ID: ${templateId}, Boxes: ${JSON.stringify(boxes)}`);

  try {
    // Pass the extracted data to the API function
    const result = await generateMeme({ id: templateId, boxes });

    // If generateMeme succeeds, result.success is always true
    // If it fails, it throws an error caught by the catch block
    console.log(`Meme generated successfully: ${result.url}`);
    return { url: result.url };

    // The 'else' block previously here was unreachable
  } catch (error: unknown) {
    // Use unknown for catch variable type
    console.error("Error generating meme:", error);
    // Type check the error before accessing properties
    let errorMessage = "An unexpected error occurred while generating the meme.";
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      errorMessage = (error as { message: string }).message;
    }
    return { error: errorMessage };
  }
}

export default generateMemeFromTemplate;
