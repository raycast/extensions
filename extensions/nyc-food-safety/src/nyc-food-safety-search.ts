import { showToast, Toast, getPreferenceValues, LaunchProps, showHUD, Clipboard } from "@raycast/api";
import { exec } from "child_process";
import { ExecException } from "child_process";

// Define the Command interface for type safety
type CommandArguments = {
  restaurantName: string;
};

interface Preferences {
  openaiApiKey: string;
}

interface Restaurant {
  camis: string;
  dba: string;
  boro: string;
  building: string;
  street: string;
  zipcode: string;
  phone: string;
  cuisine_description: string;
  inspection_date: string;
  action: string;
  violation_code: string;
  violation_description: string;
  critical_flag: string;
  score: string;
  grade: string;
  grade_date: string;
  record_date: string;
  inspection_type: string;
}

export default async function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  try {
    const { openaiApiKey } = getPreferenceValues<Preferences>();

    if (!openaiApiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "OpenAI API Key Missing",
        message: "Please add your OpenAI API key in the extension preferences",
      });
      return;
    }

    // Get restaurant name from arguments
    const restaurantName = props.arguments.restaurantName;

    if (!restaurantName) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Restaurant Name Required",
        message: "Please provide a restaurant name",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: `Searching for ${restaurantName}...`,
    });

    // Query NYC OpenData API
    const restaurantData = await fetchRestaurantData(restaurantName);

    if (!restaurantData || restaurantData.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Results Found",
        message: `Could not find inspection data for "${restaurantName}"`,
      });
      return;
    }

    // Generate AI summary
    const summary = await generateAISummary(restaurantData, openaiApiKey);

    // Display results
    await showHUD(summary);
    await Clipboard.copy(summary);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: `${error}`,
    });
  }
}

async function fetchRestaurantData(restaurantName: string): Promise<Restaurant[]> {
  // Encode restaurant name for URL
  const encodedName = encodeURIComponent(restaurantName.trim());

  // NYC OpenData API endpoint
  const apiUrl = `https://data.cityofnewyork.us/resource/43nn-pn8j.json?$where=dba like '%${encodedName}%'&$order=inspection_date DESC&$limit=1`;

  // Using curl to make the HTTP request
  return new Promise<Restaurant[]>((resolve, reject) => {
    const curlCommand = `curl -s "${apiUrl}"`;

    exec(curlCommand, (error: ExecException | null, stdout: string, stderr: string) => {
      if (error) {
        reject(new Error(`Error executing curl: ${error.message}`));
        return;
      }

      if (stderr) {
        reject(new Error(`Curl error: ${stderr}`));
        return;
      }

      try {
        const data = JSON.parse(stdout);
        resolve(data);
      } catch (parseError) {
        reject(new Error(`Error parsing JSON: ${parseError}`));
      }
    });
  });
}

async function generateAISummary(restaurantData: Restaurant[], apiKey: string): Promise<string> {
  try {
    // Sort by most recent inspection date
    restaurantData.sort((a, b) => {
      return new Date(b.inspection_date).getTime() - new Date(a.inspection_date).getTime();
    });

    const mostRecent = restaurantData[0];

    // Format inspection date
    const inspectionDate = mostRecent.inspection_date ? formatDate(new Date(mostRecent.inspection_date)) : "Unknown";

    // Prepare data for OpenAI
    const restaurantInfo = {
      name: mostRecent.dba,
      inspectionDate: inspectionDate,
      grade: mostRecent.grade || "Not Graded",
      score: mostRecent.score || "N/A",
      criticalFlag: mostRecent.critical_flag || "N/A",
      violationDescription: mostRecent.violation_description || "No violations found",
      cuisine: mostRecent.cuisine_description,
      address: `${mostRecent.building} ${mostRecent.street}, ${mostRecent.boro}, NY ${mostRecent.zipcode}`,
    };

    // Using curl to make the OpenAI API request
    return new Promise<string>((resolve, reject) => {
      const payload = JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that provides clear, focused summaries of restaurant health inspection data. 
            Format your response in exactly 4 lines:
            🏪 [Restaurant Name] ([Cuisine Type])
            📍 [Full Address]
            📋 Current Grade: [grade] (Last inspected: [date])
            ⚠️ [If violations exist: Brief, clear description of the most serious recent violation. If no violations: "No recent violations found."]
            
            Keep it factual and straightforward. For violations, focus on food safety implications.`,
          },
          {
            role: "user",
            content: `Provide a summary for ${restaurantInfo.name}:\n\nInspection Date: ${restaurantInfo.inspectionDate}\nGrade: ${restaurantInfo.grade}\nScore: ${restaurantInfo.score}\nCritical Flag: ${restaurantInfo.criticalFlag}\nViolation: ${restaurantInfo.violationDescription}\nCuisine: ${restaurantInfo.cuisine}\nAddress: ${restaurantInfo.address}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      // Escape the payload for shell command
      const escapedPayload = payload.replace(/"/g, '\\"');

      const curlCommand = `curl -s -X POST https://api.openai.com/v1/chat/completions \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${apiKey}" \
        -d "${escapedPayload}"`;

      exec(curlCommand, (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          reject(`Error executing curl: ${error.message}`);
          return;
        }

        if (stderr) {
          reject(`Curl error: ${stderr}`);
          return;
        }

        try {
          const response = JSON.parse(stdout);
          if (response.error) {
            reject(`OpenAI API error: ${response.error.message}`);
            return;
          }

          resolve(response.choices[0].message.content || "Unable to generate summary");
        } catch (parseError) {
          reject(`Error parsing JSON: ${parseError}`);
        }
      });
    });
  } catch (error) {
    // Log error to Raycast console
    const errorMessage = error instanceof Error ? error.toString() : String(error);
    return `Error generating summary: ${errorMessage}`;
  }
}

// Simple date formatter function to avoid date-fns dependency
function formatDate(date: Date): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
}
