import { useContext, useState } from "react";
import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

import { RoomContext } from "../contexts/RoomsContext";
import { AppIcons, Room, SupportedApps } from "../types";
import { isMeetLink, isTeamsLink, isValidUrl, isZoomLink } from "../utils";

export default function AddRoomForm(props: { room?: Room }) {
  const { room } = props;

  const nav = useNavigation();
  const roomContext = useContext(RoomContext);

  if (!roomContext) {
    throw new Error("AddRoomForm must be used within a RoomProvider");
  }

  const { addRoom } = roomContext;

  const [detectedApp, setDetectedApp] = useState<
    | {
        app: SupportedApps;
        icon: AppIcons;
      }
    | undefined
  >(room ? { app: room.app, icon: room.icon } : undefined);

  const { handleSubmit, itemProps } = useForm<Room>({
    onSubmit(values) {
      // add the room to state and save to local storage
      addRoom({
        ...values,
        icon: detectedApp?.icon ?? AppIcons.Generic,
        app: detectedApp?.app ?? SupportedApps.Generic,
      })
        .then(() => {
          showToast({
            style: Toast.Style.Success,
            title: "Yay!",
            message: `"${values.name}" added to Speed Dial`,
          });
          nav.pop();
        })
        .catch(() => {
          showToast({
            style: Toast.Style.Failure,
            title: "Oops!",
            message: `A room with the same URL already exists`,
          });
        });
    },
    validation: {
      name: FormValidation.Required,
      url: (value) => {
        if (!value) {
          return "The URL is required";
        } else if (!isValidUrl(value)) {
          return "Please enter a valid URL";
        }
      },
    },
    initialValues: {
      name: room?.name ?? "",
      url: room?.url ?? "",
    },
  });

  // detect the app based on the meeting URL
  const detectApp = (event: Form.Event<string>) => {
    const url = event.target.value;
    if (!url) {
      setDetectedApp(undefined);
      return;
    }
    if (isZoomLink(url)) {
      setDetectedApp({ app: SupportedApps.Zoom, icon: AppIcons.Zoom });
    } else if (isMeetLink(url)) {
      setDetectedApp({ app: SupportedApps.Meet, icon: AppIcons.Meet });
    } else if (isTeamsLink(url)) {
      setDetectedApp({ app: SupportedApps.Teams, icon: AppIcons.Teams });
    } else {
      setDetectedApp(undefined);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Room" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Meeting URL" placeholder="Enter meeting URL" {...itemProps.url} onBlur={detectApp} />
      <Form.Separator />
      <Form.TextField title="Meeting Room Name" placeholder="1-1 w/ James, Sales Standup..." {...itemProps.name} />
      {detectedApp && <Form.Description title="App" text={`${detectedApp.app}`} />}
    </Form>
  );
}
