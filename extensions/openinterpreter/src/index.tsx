import { Action, ActionPanel, List, LocalStorage, Toast, clearSearchBar, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { ConverseWithInterpretrer, StreamParser } from "./utils/python_handlers";

export interface StorageValue {
  name: string;
  long_value: string;
}

export default function Command() {
  const [sendInput, setSendInput] = useState<(input: string) => void>();
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [streamParser, setStreamParser] = useState<StreamParser>();
  const [killFn, setKillFn] = useState<() => void>();
  const [searchText, setSearchText] = useState<string>("");
  const [thisQueryName, setThisQueryName] = useState<string | undefined>();
  const [fullMessage, setFullMessage] = useState<string>("");

  const [savedListItems, setSavedListItems] = useState<Record<string, string>>({});

  useEffect(() => {
    LocalStorage.allItems().then((items) => {
      console.log(items);
      setSavedListItems(items);
    });
  }, []);

  useEffect(() => {
    const [sendInput, output$, kill_fn] = ConverseWithInterpretrer();
    setSendInput(() => sendInput);
    setKillFn(() => () => {
      kill_fn();
      setLoading(false);
      setSearchText("Killed, please try again.");
    });

    const this_stream_parser = new StreamParser(setOutput, setLoading, (full_message) => {
      setFullMessage(full_message);
    });
    setStreamParser(() => this_stream_parser);

    const subscription = output$.subscribe({
      next: (data) => {
        try {
          data
            .split("\n")
            .filter((line) => line !== "")
            .forEach((line) => this_stream_parser.update(JSON.parse(line.trim())));
        } catch (e) {
          console.error(`Got garbage from the sub-process: ${e} \n ${data}`);
        }
      },
      error: (err) => console.error(`Something went wrong: ${err}`),
    });

    return () => {
      subscription.unsubscribe();
      kill_fn();
    };
  }, []);

  const actions = (
    <ActionPanel title="Actions">
      {!loading ? (
        <Action
          title="Send"
          autoFocus
          onAction={() => {
            if (searchText === "") return;

            if (thisQueryName === undefined) {
              setThisQueryName(searchText);
            }
            setLoading(true);
            sendInput?.(searchText);
            streamParser?.user_question(searchText);
            clearSearchBar();
          }}
        />
      ) : null}
      <Action
        title="Kill"
        onAction={async () => {
          const toast = await showToast({ title: "Killing running process...", style: Toast.Style.Animated });
          killFn?.();
          toast.style = Toast.Style.Success;
          toast.title = "Process Killed Successfully";
        }}
      />
      <Action
        title="Save Session"
        onAction={() => {
          LocalStorage.setItem(thisQueryName ?? "default", fullMessage);
        }}
      />
      <Action
        title="Clear Session History"
        onAction={() => {
          LocalStorage.clear();
          setSavedListItems({});
        }}
      />
    </ActionPanel>
  );

  const past_items = Object.entries(savedListItems).map(([key, value]) => {
    const stream_parser = new StreamParser();
    stream_parser.build_context(value);
    return (
      <List.Item
        title={key}
        key={key}
        detail={<List.Item.Detail markdown={stream_parser.getContent()} />}
        actions={actions}
      />
    );
  });

  const rows = [];

  if (thisQueryName !== undefined) {
    rows.push(
      <List.Item
        key={"default"}
        title={thisQueryName}
        detail={<List.Item.Detail markdown={output} />}
        actions={actions}
      />
    );
  } else {
    rows.push(<List.Item key={"default"} title={"Ask a question"} actions={actions} />);
  }

  if (past_items.length > 0) {
    rows.push(...past_items);
  }

  return (
    <List
      navigationTitle="Talk to OpenInterpreter"
      searchBarPlaceholder={loading ? "Loading..." : "Ask a question..."}
      isLoading={loading}
      onSearchTextChange={(text) => {
        setSearchText(text);
      }}
      isShowingDetail={true}
      actions={actions}
      filtering={false}
    >
      {Object.entries(savedListItems).length === 0 && output === "" ? (
        <List.EmptyView title="Make a request to get started" />
      ) : (
        rows
      )}
    </List>
  );
}
