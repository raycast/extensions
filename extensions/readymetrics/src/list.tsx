import { ActionPanel, Detail, List, Action, Toast } from "@raycast/api";
import { Checkin, requestUpcomingCheckins, requestPastCheckins } from "./client/readymetrics";
import { useEffect, useLayoutEffect, useState } from "react";
import CheckinListItem from "./components/CheckinListItem";

/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types */

export default function Command() {
  const [pastCheckins, setPastCheckins] = useState<Checkin[]>([]);
  const [upcomingCheckins, setUpcomingCheckins] = useState<Checkin[]>([]);

  const fetchCheckins = async () => {
    const upcomingResponse = await requestUpcomingCheckins();
    setUpcomingCheckins(upcomingResponse);
    const pastResponse = await requestPastCheckins();
    setPastCheckins(pastResponse);
  };

  useEffect(() => {
    fetchCheckins().catch(async () => {
      const toast = new Toast({
        style: Toast.Style.Failure,
        title: "An error occurred",
        message: "Please verify your API key and try again.",
      });
      await toast.show();
      return [];
    });
  }, []);

  return (
    <List>
      <List.Section
        title={
          "Upcoming \t" +
          (upcomingCheckins.length > 1 ? upcomingCheckins.length + " check-ins" : upcomingCheckins.length + " check-in")
        }
      >
        {upcomingCheckins?.map((upcomingCheckin: Checkin) => {
          return <CheckinListItem key={upcomingCheckin.id} checkin={upcomingCheckin} />;
        })}
      </List.Section>
      <List.Section
        title={
          "Past \t" + (pastCheckins.length > 1 ? pastCheckins.length + " check-ins" : pastCheckins.length + " check-in")
        }
      >
        {pastCheckins?.map((pastCheckin: Checkin) => {
          return <CheckinListItem key={pastCheckin.id} checkin={pastCheckin} />;
        })}
      </List.Section>
    </List>
  );
}
