import { useEffect, useState } from "react";
import { showToast, Toast, Form, Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { authorize, client, logoutAndClearToken } from "./oauth";
import { fetchColors, createGoogleEvent } from "./calendarApi";
import { CalendarColors } from "./viewTodayEvents";


export interface EventFormValues {
  eventName: string;
  eventStartTime: Date | null;
  eventDuration: string;
  eventColor: string;
  eventDescription: string;
  eventAvailability: string;
}

// Define your color map
const googleColorNameMap: { [key: string]: string } = {
  "1": "Lavender",
  "2": "Sage",
  "3": "Grape",
  "4": "Flamingo",
  "5": "Banana",
  "6": "Tangerine",
  "7": "Peacock",
  "8": "Graphite",
  "9": "Blueberry",
  "10": "Basil",
  "11": "Tomato",
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [colors, setColors] = useState<CalendarColors>({ event: {}, calendar: {} });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const { handleSubmit, itemProps, reset } = useForm<EventFormValues>({
    initialValues: {
      eventName: "",
      eventStartTime: null,
      eventDuration: "30",
      eventDescription: "",
      eventColor: "1",
      eventAvailability: "busy",
    },
    
    async onSubmit(values) {
      try {
        const accessToken = await authorize();
        if (!accessToken) {
          throw new Error("Failed to get an access token.");
        }
    
        // Now call createGoogleEvent with the access token
        const createdEvent = await createGoogleEvent(values, accessToken);
        showToast(Toast.Style.Success, "Event Created");
      } catch (error) {
        console.error("Error:", error);
        showToast(Toast.Style.Failure, "Failed to create event", error instanceof Error ? error.message : String(error));
      }
    }
    
  });

  useEffect(() => {
    async function checkAuthentication() {
      try {
        const accessToken = await authorize(); 
        setIsAuthenticated(true);
        const colorsResponse = await fetchColors();
        setColors(colorsResponse);
      } catch (error) {
        setIsAuthenticated(false);
        showToast(Toast.Style.Failure, "Authentication required", error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoading(false);
      }
    }
    checkAuthentication();
  }, []);

  if (isLoading) {
    return <Detail isLoading={true} />;
  }
  
  if (!isAuthenticated) {
    return <Detail markdown="Please authenticate to create events." />;
  }


  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Event" icon={Icon.Plus} onSubmit={handleSubmit} />
          <Action title="Log Out" icon={Icon.Person} onAction={logoutAndClearToken} />
        </ActionPanel>

      }>
      <Form.TextField 
        title="Title" 
        placeholder="Enter Event Title" {...itemProps.eventName} 
      />
      <Form.DatePicker 
        title="Start Time"  
        {...itemProps.eventStartTime} 
      />
      <Form.Dropdown 
        title="Duration" 
        {...itemProps.eventDuration}>
          {[
            15, 30, 45, 60, 75, 90, 120, 150, 180, 210, 240, 270, 300
            ].map(duration => {
          let hours = Math.floor(duration / 60);
          let minutes = duration % 60;
          let title = "";
    
          if (hours > 0) {
          title += `${hours}h`;
          }
          if (minutes > 0) {
          if (title !== "") {
          title += " ";
          }
          title += `${minutes}min`;
          }

      return (
        <Form.Dropdown.Item 
          value={duration.toString()} 
          title={title} 
          key={duration} />
          );
        })}
      </Form.Dropdown>
        <Form.Dropdown
          title="Color"
          {...itemProps.eventColor}
        >
          {Object.entries(colors.event).map(([key, colorDetails]) => {
            const colorName = googleColorNameMap[key] || colorDetails.background;
            return (
              <Form.Dropdown.Item
                key={key}
                value={key}
                title={colorName}
                icon={{ source: Icon.CircleFilled, tintColor: colorDetails.background }}
              />
            );
          })}
        </Form.Dropdown>
        <Form.TextArea 
          title="Description" 
          placeholder="Add a description (optional)" 
          {...itemProps.eventDescription} 
        />
        <Form.Dropdown 
          title="Availability" 
          {...itemProps.eventAvailability}>
          <Form.Dropdown.Item 
            value="busy" 
            title="Busy" 
          />
          <Form.Dropdown.Item 
            value="free" 
            title="Free" 
          />
        </Form.Dropdown>
    </Form>
  );
}


