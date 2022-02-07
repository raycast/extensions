import { useEffect, useState } from "react";
import axios from "axios";
import {
  List,
  showToast,
  ToastStyle,
  getLocalStorageItem,
  setLocalStorageItem,
  getPreferenceValues,
} from "@raycast/api";
import TicketItem from "./TicketItem";

interface Preferences {
  domain: string;
  apikey: string;
}
const preferences: Preferences = getPreferenceValues();

interface State {
  tickets?: any;
  inboxes?: any;
  ticketpriorities?: any;
  customers?: any;
  companies?: any;
  messages?: any;
  error?: Error;
}

function getIndex(arr: any[], id: any) {
  return arr.findIndex((obj: { id: any }) => obj.id == id);
}

export default function Command() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchTickets() {
      try {
        axios
          .get(
            "https://" +
              preferences.domain +
              '.teamwork.com/desk/api/v2/tickets.json?includes=all&filter={"status": {"$in": [1,3,244,245]}}&orderBy=updatedAt&orderMode=DESC',
            {
              headers: {
                "Content-type": "application/json",
                Authorization: "Bearer " + preferences.apikey,
              },
            }
          )
          .then((res) => {
            setLocalStorageItem("all-tickets-data", JSON.stringify(res.data));
            setState({
              tickets: res.data.tickets,
              inboxes: res.data.included.inboxes,
              ticketpriorities: res.data.included.ticketpriorities,
              customers: res.data.included.customers,
              companies: res.data.included.companies,
            });
          })
          .catch((error) => {
            setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
          });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }
    fetchTickets();
  }, []);

  if (state.error) {
    showToast(ToastStyle.Failure, "Failed loading tickets", state.error.message);
  }

  return (
    <List
      navigationTitle="Tickets"
      isLoading={!state.tickets && !state.error}
      searchBarPlaceholder={"Search for tickets"}
    >
      {state.tickets?.map((item: any, index: number) => (
        <TicketItem
          key={item.id}
          item={item}
          inbox={state.inboxes[getIndex(state.inboxes, item.inbox.id)]}
          index={index}
        />
      ))}
    </List>
  );
}
