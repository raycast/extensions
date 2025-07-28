import { showToast, Toast, open } from "@raycast/api";

type Input = {
  /**
   * The title of the WhenToMeet event
   * @example "Team Standup" or "Client Meeting"
   */
  title: string;
  /**
   * Optional description for the event
   * @example "Weekly team sync to discuss progress and blockers"
   */
  description?: string;
  /**
   * Duration of each time slot in minutes
   * @example 30 for a 30-minute meeting, 60 for a 1-hour meeting
   * @default 60
   */
  slotLength?: number;
  /**
   * Array of time slots in ISO format "start,end"
   * @example ["2025-02-10T09:00:00,2025-02-10T09:30:00", "2025-02-10T10:00:00,2025-02-10T10:30:00"]
   */
  slots: string[];
};

export default async (input: Input) => {
  try {
    // Validate input
    if (!input.title || input.title.trim() === "") {
      throw new Error("Event title is required");
    }

    if (!input.slots || input.slots.length === 0) {
      throw new Error("At least one time slot is required");
    }

    const slotLength = input.slotLength || 60;

    // Build URL
    const baseUrl = "https://whentomeet.io/events/new";
    const urlParams = new URLSearchParams();

    urlParams.append("title", input.title.trim());
    if (input.description) {
      urlParams.append("description", input.description.trim());
    }
    urlParams.append("slotLength", slotLength.toString());

    // Add slots
    input.slots.forEach((slot) => {
      urlParams.append("slots", slot);
    });

    const finalUrl = `${baseUrl}?${urlParams.toString()}`;

    // Check URL length and warn if approaching limits
    const URL_LENGTH_WARNING = 1500;
    const URL_LENGTH_MAX = 2000;

    if (finalUrl.length > URL_LENGTH_MAX) {
      throw new Error(
        `URL too long (${finalUrl.length} chars). Try reducing the number of time slots or shortening the title/description.`,
      );
    }

    if (finalUrl.length > URL_LENGTH_WARNING) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Long URL Warning",
        message: `URL is ${finalUrl.length} characters. May not work on all systems.`,
      });
    }

    // Open the URL
    await open(finalUrl);

    await showToast({
      style: Toast.Style.Success,
      title: "WhenToMeet Event Created",
      message: `"${input.title}" event opened in browser`,
    });

    return {
      url: finalUrl,
      title: input.title,
      slotLength,
      slotCount: input.slots.length,
      message: `Successfully created WhenToMeet event "${input.title}" with ${input.slots.length} time slot(s)`,
    };
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error Creating Event",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
};
