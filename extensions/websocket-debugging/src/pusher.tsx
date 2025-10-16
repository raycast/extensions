import { List, LocalStorage, getPreferenceValues, ActionPanel, showToast, Toast, Action } from "@raycast/api";
import { SelectChannelAction, CreateEventAction } from "./components/index";
import { useEffect, useState, useCallback } from "react";
import { Log, Preferences, State } from "./types";
import { nanoid } from "nanoid";
import GetTime from "./utils";
import PusherServer from "pusher";
import Echo from "laravel-echo";
import Pusher from "pusher-js";

export default function Command() {
  const preferences: Preferences = getPreferenceValues();

  const PusherAppID = preferences.PusherAppID;
  const PusherAppKey = preferences.PusherAppKey;
  const PusherAppSecret = preferences.PusherAppSecret;
  const PusherAppCluster = preferences.PusherAppCluster;
  const PusherAppEncrypted = preferences.PusherAppEncrypted;

  const [echoChannel, setEchoChannel] = useState<any>();

  const [state, setState] = useState<State>({
    isLoading: true,
    searchText: "",
    logs: [],
    visibleLogs: [],
    selectedItemId: "",
    channel: "my-channel",
  });

  const callback = (event: string, message: string) => {
    const newLog: Log = {
      id: nanoid(),
      event: event,
      channel: state.channel,
      message: JSON.stringify(message, null, 4),
      time: GetTime(),
    };

    setState((previous) => ({
      ...previous,
      logs: [newLog, ...previous.logs],
      searchText: "",
      isLoading: false,
      selectedItemId: newLog.id,
    }));
  };

  useEffect(() => {
    (async () => {
      const storedChannel = await LocalStorage.getItem<string>("pusher-debug-channel");

      if (storedChannel) {
        let success = false;

        try {
          setState((previous) => ({ ...previous, channel: storedChannel }));
          success = true;
        } catch (e) {
          setState((previous) => ({ ...previous }));
          success = false;
        }

        if (success) {
          await showToast({ title: "Fetched", message: "Feteched stored channel: " + storedChannel });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Not fetched",
            message: "Using default channel: " + state.channel,
          });
        }
      } else {
        setState((previous) => ({ ...previous }));
        await showToast({
          title: "No stored channel",
          message: "Using default channel: " + state.channel,
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (echoChannel) {
      echoChannel.unsubscribe();
    }

    LocalStorage.setItem("pusher-debug-channel", state.channel);

    const pusher = new Pusher(PusherAppKey, {
      cluster: PusherAppCluster,
    });

    const echo = new Echo({
      broadcaster: "pusher",
      key: PusherAppKey,
      client: pusher,
    });

    setEchoChannel(echo.channel(state.channel));
    setState((previous) => ({ ...previous, logs: [], isLoading: true }));
  }, [state.channel]);

  useEffect(() => {
    if (echoChannel && echoChannel.pusher.bind_global) {
      setState((previous) => ({ ...previous, isLoading: false }));

      echoChannel.stopListeningToAll();
      echoChannel.listenToAll(callback);
    }
  }, [echoChannel, state.channel]);

  const handleSelect = useCallback(
    (channel: string) => {
      setState((previous) => ({ ...previous, channel: channel, isLoading: true }));
      showToast({ title: "Updated", message: "Now using new channel: " + channel });
    },
    [state.channel, setState, showToast]
  );

  const handleCreate = useCallback(
    (event: string, message: string | null) => {
      const pusher = new PusherServer({
        appId: PusherAppID,
        key: PusherAppKey,
        secret: PusherAppSecret,
        cluster: PusherAppCluster,
        useTLS: PusherAppEncrypted,
      });

      pusher.trigger(state.channel, event, message);

      showToast({ title: "Event Sent", message: "Your event, " + event + " has been sent." });
    },
    [state.channel, showToast]
  );

  return (
    <List
      navigationTitle={"Pusher Debug on Channel: " + state.channel}
      selectedItemId={state.selectedItemId}
      isShowingDetail={true}
      isLoading={state.isLoading}
      // searchText={state.searchText}
      // onSearchTextChange={(newValue) => {
      //	setState((previous) => ({ ...previous, searchText: newValue }));
      // }}
      actions={
        <ActionPanel title="Pusher Debug">
          <CreateEventAction onCreate={handleCreate} />
          <SelectChannelAction defaultChannel={state.channel} onCreate={handleSelect} />
        </ActionPanel>
      }
    >
      <List.Section title={state.channel}>
        {state.logs.map((log, index) => (
          <List.Item
            id={log.id}
            key={log.id}
            title={log.event}
            accessories={[{ text: log.time }]}
            detail={
              <List.Item.Detail
                markdown={log.message}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title={"Event: " + log.event} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title={"Channel: " + log.channel} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title={"Time: " + log.time} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel title="Pusher Debug">
                <CreateEventAction onCreate={handleCreate} />
                <Action.CopyToClipboard content={log.message} shortcut={{ modifiers: ["cmd"], key: "." }} />
                <SelectChannelAction onCreate={handleSelect} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
