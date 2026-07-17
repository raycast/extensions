import fetch from "node-fetch";
import { BASE_URL } from "../scira";

// Define Message type to match what the API expects
type Message = {
  role: "user";
  parts: {
    type: "text";
    text: string;
  }[];
};

type Input = {
  query: string;
  group?: "web" | "x";
};

export default async function (input: Input) {
  // Extract the parameters
  const query = input?.query;
  const group = input?.group || "web"; // Default to web if not specified

  // Make sure query is defined
  if (!query) {
    console.error("Missing required parameter:", { query, input });
    throw new Error("Missing required parameter: query must be provided");
  }

  // Define the request body type with optional group
  type RequestBody = {
    messages: Message[];
    model: string;
    group: string;
  };

  const body: RequestBody = {
    messages: [
      {
        role: "user",
        parts: [
          {
            type: "text",
            text: query,
          },
        ],
      },
    ],
    model: "scira-default",
    group,
  };

  console.log("Sending request with:", {
    messages: body.messages,
    model: body.model,
    group: body.group,
  });

  try {
    // Simple POST request to the local endpoint
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // Check if the response is ok
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Get the response text
    const result = await response.text();
    return result;
  } catch (error) {
    console.error("Error fetching from Scira:", error);
    throw error;
  }
}
