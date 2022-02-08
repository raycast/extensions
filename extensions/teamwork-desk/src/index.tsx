import { useEffect, useState } from "react";
import axios from "axios";
import { List, showToast, ToastStyle, getLocalStorageItem, setLocalStorageItem } from "@raycast/api";
import TicketItem from "./TicketItem";
import { getIndex, getllTicketsUrl, getHeaders } from "./utils";
interface StatesData {
  tickets: [] | null;
  inboxes: [] | null;
  ticketpriorities: [] | null;
  customers: [] | null;
  companies: [] | null;
  messages: [] | null;
  error: Error | null;
  loading: boolean;
}
interface ItemData {
  id: number;
  isRead: boolean;
  subject: string;
  updatedAt: string;
  tasks: [] | null;
  inbox: { id: number };
}

export default function Command() {
  const [state, setState] = useState<StatesData>({
    tickets: null,
    inboxes: null,
    ticketpriorities: null,
    customers: null,
    companies: null,
    messages: null,
    error: null,
    loading: false,
  });

  async function fetchTickets() {
    const allData: string | undefined = await getLocalStorageItem("all-data");
    try {
      axios.interceptors.request.use(
        (config) => {
          if (allData) {
            setState({ ...JSON.parse(allData), loading: true });
            showToast(ToastStyle.Animated, "Loading..");
          } else {
            setState({
              tickets: null,
              inboxes: null,
              ticketpriorities: null,
              customers: null,
              companies: null,
              messages: null,
              error: null,
              loading: true,
            });
          }
          return config;
        },
        (error) => {
          setState({
            tickets: null,
            inboxes: null,
            ticketpriorities: null,
            customers: null,
            companies: null,
            messages: null,
            error: error instanceof Error ? error : new Error("Something went wrong"),
            loading: false,
          });
          return Promise.reject(error);
        }
      );
      axios
        .get(getllTicketsUrl(), getHeaders())
        .then((res) => {
          if (res.data.length == 0) {
            showToast(ToastStyle.Failure, "No tickets..");
          } else {
            setLocalStorageItem(
              "all-data",
              JSON.stringify({
                tickets: res.data.tickets,
                inboxes: res.data.included.inboxes,
                ticketpriorities: res.data.included.ticketpriorities,
                customers: res.data.included.customers,
                companies: res.data.included.companies,
                messages: res.data.included.messages,
                error: null,
                loading: false,
              })
            );
            setState({
              tickets: res.data.tickets,
              inboxes: res.data.included.inboxes,
              ticketpriorities: res.data.included.ticketpriorities,
              customers: res.data.included.customers,
              companies: res.data.included.companies,
              messages: res.data.included.messages,
              error: null,
              loading: false,
            });
            showToast(ToastStyle.Success, "Updated.");
          }
        })
        .catch((error) => {
          setState({
            tickets: null,
            inboxes: null,
            ticketpriorities: null,
            customers: null,
            companies: null,
            messages: null,
            error: error instanceof Error ? error : new Error("Something went wrong"),
            loading: false,
          });
        });
    } catch (error) {
      setState({
        tickets: null,
        inboxes: null,
        ticketpriorities: null,
        customers: null,
        companies: null,
        messages: null,
        error: error instanceof Error ? error : new Error("Something went wrong"),
        loading: false,
      });
    }
  }

  useEffect(() => {
    fetchTickets();
  }, []);

  if (state.error) {
    showToast(ToastStyle.Failure, "Failed loading tickets", state.error.message);
  }

  return (
    <List
      navigationTitle="Tickets"
      isLoading={state.loading && !state.error}
      searchBarPlaceholder={"Search for tickets"}
    >
      {state.tickets?.map((item: ItemData, index: number) => (
        <TicketItem
          key={index}
          item={item}
          inbox={
            state.inboxes
              ? {
                  id: getIndex(state.inboxes, item.inbox.id),
                  publicIconImage: "",
                  name: "",
                }
              : {
                  id: "",
                  publicIconImage: "",
                  name: "",
                }
          }
          index={index}
        />
      ))}
    </List>
  );
}
