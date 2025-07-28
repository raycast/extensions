import { useState, useEffect, useMemo } from "react";
import { Action, ActionPanel, Form, showToast, Toast, open, Icon } from "@raycast/api";
import { useAI } from "@raycast/utils";

interface EventParams {
  title?: string;
  description?: string;
  slots?: string[];
  slotLength?: number;
}

// Create comprehensive date context for AI
const createDateContext = () => {
  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];
  const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });

  // Get specific dates for next 2 weeks
  const dateMap: Record<string, string> = {};
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  dateMap["tomorrow"] = tomorrow.toISOString().split("T")[0];

  // Calculate dates for each day
  dayNames.forEach((day) => {
    const currentDayIndex = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const targetDayIndex = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(
      day.toLowerCase(),
    );

    // Calculate the next occurrence of this day
    let daysUntilNext = targetDayIndex - currentDayIndex;
    if (daysUntilNext <= 0) {
      daysUntilNext += 7; // Next week
    }

    const nextOccurrence = new Date(now);
    nextOccurrence.setDate(now.getDate() + daysUntilNext);

    // Calculate the occurrence after that (always next week)
    const weekAfter = new Date(nextOccurrence);
    weekAfter.setDate(nextOccurrence.getDate() + 7);

    // For "next [day]", we always want the very next occurrence
    dateMap[`next ${day.toLowerCase()}`] = nextOccurrence.toISOString().split("T")[0];

    // For "this [day]", only include if it's still coming this week (1-6 days away)
    if (daysUntilNext >= 1 && daysUntilNext <= 6) {
      dateMap[`this ${day.toLowerCase()}`] = nextOccurrence.toISOString().split("T")[0];
    }

    // Map just the day name to the very next occurrence
    dateMap[day.toLowerCase()] = nextOccurrence.toISOString().split("T")[0];
  });

  return {
    currentDate,
    dayOfWeek,
    dateMap,
    year: now.getFullYear(),
  };
};

export default function Command() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Editable form fields
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [slotLength, setSlotLength] = useState("60");

  // Track the last AI response to avoid unnecessary updates
  const [lastProcessedAiResponse, setLastProcessedAiResponse] = useState<string | null>(null);

  // Debounce the query input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  const dateContext = createDateContext();

  const { data: aiResponse, isLoading: aiLoading } = useAI(
    debouncedQuery
      ? `Parse this natural language request for creating a WhenToMeet event and extract the following information in JSON format:

Request: "${debouncedQuery}"

CRITICAL DATE MAPPING - Use these EXACT dates for relative terms:
Today is: ${dateContext.currentDate} (${dateContext.dayOfWeek})

DATE REFERENCE TABLE (use these exact dates):
${Object.entries(dateContext.dateMap)
  .map(([key, value]) => `- "${key}" = ${value}`)
  .join("\n")}

INSTRUCTIONS:
1. Extract event title, description, and duration from the request
2. For each time mentioned, create time slots using the EXACT dates from the reference table above
3. Convert times to UTC timezone in ISO 8601 format
4. If multiple times are mentioned for the same day, create separate slots
5. Default duration is 60 minutes if not specified
6. IMPORTANT: When suggesting time slots, consider when the activity is most likely to be done based on the event type and context. For example:
   - Work meetings: typically during business hours (9am-5pm)
   - Social events: often in evenings or weekends
   - Exercise/activities: consider typical timing (morning workouts, evening classes)
   - Client meetings: business hours
   - Team events: consider work schedules and time zones

Return ONLY valid JSON with these fields:
- title: string (event title)
- description: string (event description)
- slots: array of time slot pairs like ["${dateContext.year}-01-15T14:00:00Z,${dateContext.year}-01-15T16:00:00Z"]
- slotLength: number (duration in minutes)

EXAMPLES:
"Client meeting next Tuesday 2pm, 3pm, or 4pm for 2 hours"
→ Use date for "next tuesday" from table above
→ Create 3 slots: 2pm-4pm, 3pm-5pm, 4pm-6pm (business hours appropriate for client meetings)

"Team standup tomorrow at 9am for 30 minutes"  
→ Use date for "tomorrow" from table above
→ Create 1 slot: 9am-9:30am (morning time typical for daily standups)

"Evening workout session this Friday"
→ Use date for "this friday" from table above
→ Suggest evening times like 6pm-7pm or 7pm-8pm (typical for post-work exercise)`
      : "",
    {
      execute: !!debouncedQuery,
    },
  );

  // Helper function to parse AI response
  const getParsedParams = (aiResponse: string): EventParams | null => {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    } catch {
      return null;
    }
  };

  const parsedParams = useMemo(() => {
    return aiResponse ? getParsedParams(aiResponse) : null;
  }, [aiResponse]);

  // Update editable fields only when AI response actually changes
  useEffect(() => {
    // Process if we have a new AI response and it's not loading
    if (aiResponse && aiResponse !== lastProcessedAiResponse && !aiLoading) {
      const parsed = getParsedParams(aiResponse);
      if (parsed) {
        if (parsed.title) {
          setEventTitle(parsed.title);
        }
        if (parsed.description) {
          setEventDescription(parsed.description);
        }
        if (parsed.slotLength) {
          setSlotLength(parsed.slotLength.toString());
        }
      }
      setLastProcessedAiResponse(aiResponse);
    }
  }, [aiResponse, aiLoading]);

  const generateUrl = async () => {
    if (!parsedParams || isGenerating || aiLoading || (query && !debouncedQuery)) {
      return;
    }

    try {
      setIsGenerating(true);

      // Build URL using editable form values
      const baseUrl = "https://whentomeet.io/events/new";
      const urlParams = new URLSearchParams();

      if (eventTitle) urlParams.append("title", eventTitle);
      if (eventDescription) urlParams.append("description", eventDescription);
      if (slotLength) urlParams.append("slotLength", slotLength);

      // Add slots from parsed params (time slots aren't editable in this version)
      if (parsedParams.slots) {
        parsedParams.slots.forEach((slot) => {
          urlParams.append("slots", slot);
        });
      }

      const finalUrl = `${baseUrl}?${urlParams.toString()}`;

      // Check URL length and warn if approaching limits
      const URL_LENGTH_WARNING = 1500; // Conservative warning threshold
      const URL_LENGTH_MAX = 2000; // Hard limit

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

      await open(finalUrl);
      await showToast({
        style: Toast.Style.Success,
        title: "WhenToMeet URL opened",
        message: "Event creation page opened in browser",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error generating URL",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Better loading state messages and icons
  const getActionTitle = () => {
    if (isGenerating) return "Creating Event…";
    if (aiLoading) return "Processing…";
    if (query && !debouncedQuery) return "Typing…";
    return "Create WhenToMeet Event";
  };

  const getActionIcon = () => {
    if (isGenerating) return Icon.Globe;
    if (aiLoading) return Icon.MagnifyingGlass;
    return Icon.Calendar;
  };

  // Enhanced placeholder text with examples
  const getPlaceholderText = () => {
    const examples = [
      "Team standup tomorrow at 9am and 10am for 30 minutes",
      "Client meeting next Tuesday 2pm, 3pm, or 4pm for 1 hour",
      "Project kickoff Monday 9am, 10am, and 2pm for 90 minutes",
      "Coffee chat this Friday 3pm to 5pm",
      "Workshop next week Wednesday 1pm for 2 hours",
    ];
    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    return `Describe your event in natural language, e.g., "${randomExample}"`;
  };

  // Format time slots with better visual hierarchy
  const formatTimeSlots = (slots: string[]) => {
    if (!slots || slots.length === 0) return "";

    const formattedSlots = slots.map((slot, index) => {
      const [start, end] = slot.split(",");
      // Treat UTC dates from AI as local dates by removing the 'Z'
      // ‚this way we can display the time in the user's local timezone
      const startDate = new Date(start.endsWith("Z") ? start.slice(0, -1) : start);
      const endDate = new Date(end.endsWith("Z") ? end.slice(0, -1) : end);

      const formatDateTime = (date: Date) => {
        return date.toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        });
      };

      const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
      return `Timeslot #${index + 1}: ${formatDateTime(startDate)} → ${formatDateTime(endDate)} (${duration} min)`;
    });

    return formattedSlots.join("\n");
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title={getActionTitle()} icon={getActionIcon()} onAction={generateUrl} />
          {parsedParams && (
            <Action.CopyToClipboard
              title="Copy Event Details"
              content={`Title: ${eventTitle}\nDescription: ${eventDescription}\nDuration: ${slotLength} minutes\nTime Slots:\n${formatTimeSlots(parsedParams.slots || [])}`}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="query"
        title="📝 Describe Your Event"
        placeholder={getPlaceholderText()}
        value={query}
        onChange={setQuery}
        info={
          aiLoading
            ? "🤖 AI is processing your request…"
            : query && !debouncedQuery
              ? "⏳ Waiting for you to finish typing…"
              : "Use natural language to describe when and what your event is about"
        }
      />

      {parsedParams && (
        <>
          <Form.Separator />

          <Form.Description
            title="✨ Event Preview"
            text="Review and edit the details below before creating your WhenToMeet event"
          />

          <Form.TextField
            id="eventTitle"
            title="📋 Event Title"
            value={eventTitle}
            onChange={setEventTitle}
            placeholder="Enter a clear, descriptive title"
            info="This will be the main heading participants see"
          />

          <Form.TextArea
            id="eventDescription"
            title="📄 Description"
            value={eventDescription}
            onChange={setEventDescription}
            placeholder="Add context, agenda, or meeting details (optional)"
            info="Help participants understand what the event is about"
          />

          {parsedParams.slots && parsedParams.slots.length > 0 && (
            <Form.Description
              title={`🗓️ Time Options (${parsedParams.slots.length} slot${parsedParams.slots.length > 1 ? "s" : ""})`}
              text={formatTimeSlots(parsedParams.slots)}
            />
          )}

          <Form.TextField
            id="duration"
            title="⏱️ Duration (minutes)"
            value={slotLength}
            onChange={setSlotLength}
            placeholder="60"
            info="How long should each time slot be?"
          />

          {parsedParams.slots && parsedParams.slots.length > 5 && (
            <Form.Description
              title="💡 Tip"
              text="You have many time slots. Consider reducing them for better participant experience."
            />
          )}
        </>
      )}

      {!parsedParams && query && !aiLoading && debouncedQuery && (
        <>
          <Form.Separator />
          <Form.Description
            title="🤔 Having trouble?"
            text="Try being more specific about dates and times. For example: 'Team meeting tomorrow at 2pm and 3pm for 1 hour'"
          />
        </>
      )}
    </Form>
  );
}
