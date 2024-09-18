import fetch from "node-fetch";
globalThis.fetch = fetch;

import { useNavigation, getPreferenceValues } from "@raycast/api";
import Bard from "bard-ai";

import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { List, Form, Icon, ActionPanel, Action, confirmAlert, Alert } from "@raycast/api";
import useLocalStorage from "./api/useChatStorage";
import { LocalStorage } from "@raycast/api";
import { Clipboard } from "@raycast/api";

export default function Chat() {
  let {
    name: [conversationName, setConversationName],
    list: [conversationList, setConversationList],
    nameToIndexMap,
    isLoaded,
    getCurrentConversation,
  } = useLocalStorage();

  let [bardWorking, setBardWorking] = useState(true);

  // Text that is currently searched
  let [searchText, setSearchText] = useState("");

  // Whether or not loading a new message
  let [loading, setLoading] = useState(false);

  // Whether or not Bard is initializing
  let [initializing, setInitializing] = useState(true);

  // Whether or not Bard is trying to connect
  let [tryingToConnect, setTryingToConnect] = useState(true);

  const pref = getPreferenceValues();

  useEffect(() => {
    const initializeBard = async () => {
      try {
        let startTime = Date.now();
        toast(Toast.Style.Animated, "Please wait for Bard to initialize.");
        setInitializing(true);
        await Bard.init(pref["__Secure-1PSID"]);
        setInitializing(false);
        toast(Toast.Style.Success, `Bard initialized in ${(Date.now() - startTime) / 1000} seconds.`);
        setTryingToConnect(false);
      } catch {
        setBardWorking(false);
        toast(Toast.Style.Failure, `Bard couldn't connect.`);
        setTryingToConnect(false);
      }

      setConversationList((originalConversation) => {
        const updatedConversation = structuredClone(originalConversation);

        let currentConversation = getCurrentConversation(updatedConversation);
        let currentQuestion = currentConversation.questions[0];
        currentQuestion.ids = currentBard.export();
        currentConversation.ids = currentQuestion.ids;
        return updatedConversation;
      });
    };

    initializeBard();
  }, []);

  useEffect(() => {
    let currentQuestions = getCurrentConversation().questions;
    if (typeof currentQuestions === "object") {
      if (!initializing && isLoaded && currentQuestions.length && currentQuestions[0].response === "Loading...") {
        let startTime = Date.now();
        setLoading(true);
        toast(Toast.Style.Animated, "Getting response from Bard...");
        (async () => {
          let response = await currentBard.ask(currentQuestions[0].question);
          toast(Toast.Style.Success, `Response recieved in ${(Date.now() - startTime) / 1000} seconds`);
          setConversationList((originalConversation) => {
            const updatedConversation = structuredClone(originalConversation);

            let currentConversation = getCurrentConversation(updatedConversation);
            let currentQuestion = currentConversation.questions[0];
            currentQuestion.response = response;
            currentQuestion.ids = currentBard.export();
            currentConversation.ids = currentQuestion.ids;
            setLoading(false);

            return updatedConversation;
          });
        })();
      }
    }
  }, [isLoaded, initializing]);

  // Current Bard instance being used
  let [currentBard, setCurrentBard] = useState(new Bard.Chat());

  // Update the current Bard chat when there is data updated about the conversation
  useEffect(() => {
    if (typeof getCurrentConversation().ids === "object") {
      setCurrentBard(
        new Bard.Chat(
          // Use IDs if possible to save data
          getCurrentConversation().ids
        )
      );
    } else {
      setCurrentBard(new Bard.Chat());
    }
  }, [conversationList, conversationName]);

  // Shorter way to send a toast "syncronously" with IIFEs
  let toast = (type, msg) => {
    return (async () =>
      await showToast({
        style: type,
        title: msg,
      }))();
  };

  const submitResponse = async () => {
    if (initializing) {
      toast(Toast.Style.Failure, `Bard is still initialzing.`);
    } else if (!bardWorking) {
      toast(Toast.Style.Failure, `Bard appears to be unavailable at this time.`);
      return;
    } else if (!searchText) {
      toast(Toast.Style.Failure, "Cannot submit empty message.");
      return;
    } else if (loading) {
      toast(Toast.Style.Failure, "Please wait for current message to finish loading.");
      return;
    } else {
      setSearchText("");
      setLoading(true);
      let startTime = Date.now();
      toast(Toast.Style.Animated, "Getting response from Bard...");
      setConversationList((originalConversation) => {
        const updatedConversation = structuredClone(originalConversation);

        getCurrentConversation(updatedConversation).questions.unshift({
          question: searchText,
          response: "Loading...",
          metadata: {
            conversationID: "Loading IDs...",
            responseID: "Loading IDs...",
            date: new Date(),
          },
        });

        return updatedConversation;
      });

      try {
        let response = await currentBard.ask(searchText);
        toast(Toast.Style.Success, `Response recieved in ${(Date.now() - startTime) / 1000} seconds`);

        setConversationList((originalConversation) => {
          const updatedConversation = structuredClone(originalConversation);
          let currentConversation = getCurrentConversation(updatedConversation);
          let currentQuestion = currentConversation.questions[0];
          currentQuestion.response = response;
          currentQuestion.ids = currentBard.export();
          currentConversation.ids = currentQuestion.ids;
          setLoading(false);

          return updatedConversation;
        });
      } catch {
        toast(Toast.Style.Failure, `Bard appears to be unavailable at this time.`);
        setConversationList((originalConversation) => {
          const updatedConversation = structuredClone(originalConversation);

          let currentQuestion = getCurrentConversation(updatedConversation).questions[0];
          currentQuestion.response = "Failure to fetch Bard";

          setLoading(false);

          return updatedConversation;
        });
      }
    }
  };

  const deleteConversation = async () => {
    if (
      await confirmAlert({
        title: "Confirm Rset",
        message: "Are you sure you want to delete this conversation? This is an irreversible action.",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      let idx = nameToIndexMap[conversationName];
      setConversationList((original) => {
        let newConversation = structuredClone(original);
        if (newConversation.length === 1) {
          newConversation[0].ids = {};
          newConversation[0].questions = [];
          newConversation[0].name = "New Conversation";
          nameToIndexMap = ["New Conversation"];
          toast(
            Toast.Style.Success,
            `Deleted only conversation, "${conversationName}", and restored a new conversation.`
          );
          return newConversation;
        } else {
          // Delete the current conversation
          newConversation.splice(idx, 1);

          // Set to nearest newer conversation if possible, nearest older if not
          setConversationName(newConversation[idx === 0 ? idx : idx - 1].name);

          // Show a message
          toast(Toast.Style.Success, `Successfully deleted conversation "${conversationName}"`);
          return newConversation;
        }
      });
    }
  };

  const resetConversation = async () => {
    if (
      await confirmAlert({
        title: "Confirm Reset",
        message: "Are you sure you want to reset this conversation? This is an irreversible action.",
        primaryAction: {
          title: "Reset",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      setConversationList((original) => {
        // Delete the current conversation
        let newList = structuredClone(original);
        getCurrentConversation(newList).questions = [];
        toast(Toast.Style.Success, `Successfully reset conversation "${conversationName}"`);
        return newList;
      });
    }
  };
  const purgeLocalStorage = async () => {
    if (
      await confirmAlert({
        title: "Confirm Purge",
        message:
          "Are you sure you want to completely clear all memory associated with the Google Bard extension? This is an irreversable action, and will result in the loss of all of your conversations, messages, and answers.",
        primaryAction: {
          title: "Continue",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      if (
        await confirmAlert({
          title: "About to Purge",
          message: "Clicking on purge will remove all conversations and messages. Please be sure.",
          primaryAction: {
            title: "Purge",
            style: Alert.ActionStyle.Destructive,
          },
        })
      ) {
        await LocalStorage.clear();
        // ! CLOSE MAIN WINDOW HERE
      }
    }
  };

  // If possible, move to an older conversation
  const previousConversation = () => {
    let idx = nameToIndexMap[conversationName];
    // If ix is NOT the first one
    if (idx > 0) {
      let name = conversationList[idx - 1].name;
      setConversationName(name);
      toast(Toast.Style.Success, `Moved to previous conversation, "${name}"`);
    } else {
      toast(Toast.Style.Failure, "No previous conversations.");
    }
  };

  const nextConversation = () => {
    let idx = nameToIndexMap[conversationName];
    // If idx is NOT the last one
    if (idx < conversationList.length - 1) {
      let name = conversationList[idx + 1].name;
      setConversationName(name);
      toast(Toast.Style.Success, `Moved to next conversation, "${name}"`);
    } else {
      toast(Toast.Style.Failure, "No newer conversations.");
    }
  };

  // Creates React component to get a name for a conversation
  // Used for renaming, making new conversation, etc.
  function ConversationNameForm(
    title = "Create Conversation",
    submit = () => {
      return;
    }
  ) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title={title} onSubmit={submit} />
          </ActionPanel>
        }
      >
        <Form.TextField id="name" title="Name" placeholder="New Conversation Name" />
      </Form>
    );
  }

  // Validates that the new name for the conversation works, otherwise creates toast
  const validateConversationName = (name) => {
    let success = true;
    if (conversationList.map((x) => x.name).includes(name)) {
      toast(Toast.Style.Failure, `Conversation "${name}" already exists`);
      success = false;
    }
    if (!name) {
      toast(Toast.Style.Failure, "Conversation name cannot be empty");
      success = false;
    }
    if (!bardWorking) {
      toast(Toast.Style.Failure, "Please wait until Bard has reconnected.");
      success = false;
    }
    if (initializing) {
      toast(Toast.Style.Failure, "Bard is still initialzing.");
      success = false;
    }
    return success;
  };

  // Creates new conversation
  const CreateConversationAction = () => {
    const { pop } = useNavigation();

    let handleSubmitConversation = ({ name }) => {
      if (!validateConversationName(name)) {
        pop();
        return;
      }
      setConversationList((original) => {
        setCurrentBard(new Bard.Chat());
        let newList = [
          ...structuredClone(original),
          {
            name: name,
            questions: [],
          },
        ];
        nameToIndexMap[name] = newList.length - 1;
        setConversationName(name);
        return newList;
      });
      toast(Toast.Style.Success, `Sucessfully created converation "${name}"`);
      pop();
    };

    return ConversationNameForm("Create Conversation", handleSubmitConversation);
  };

  // Renames existing conversation
  const RenameConversationAction = () => {
    const { pop } = useNavigation();

    let handleRenameConversation = ({ name }) => {
      if (!validateConversationName(name)) {
        pop();
        return;
      }
      setConversationList((original) => {
        let newList = structuredClone(original);
        newList[nameToIndexMap[conversationName]].name = name;
        nameToIndexMap[name] = nameToIndexMap[conversationName];
        delete nameToIndexMap[conversationName];
        setConversationName(name);
        return newList;
      });
      toast(Toast.Style.Success, `Sucessfully renamed converation to "${name}"`);
      pop();
    };

    return ConversationNameForm("Rename Conversation", handleRenameConversation);
  };

  const copyResponse = async (response) => {
    await Clipboard.copy(response);
    toast(Toast.Style.Success, `Successfully copied response message.`);
  };

  // All of the actions in the Chat page
  const BardActionPanel = ({ response }) => (
    <ActionPanel>
      <ActionPanel.Section title="Google Bard">
        <Action icon={Icon.Stars} title="Get Answer" onAction={submitResponse} />
        <Action
          icon={Icon.CopyClipboard}
          title="Copy Answer"
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={() => copyResponse(response)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Manage Conversations">
        <Action.Push
          icon={Icon.PlusCircle}
          title="Create New Conversation"
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<CreateConversationAction />}
        />
        <Action.Push
          icon={Icon.Pencil}
          title="Rename Current Conversation"
          shortcut={{ modifiers: ["opt"], key: "r" }}
          target={<RenameConversationAction />}
        />
        <Action
          icon={Icon.ArrowUp}
          title="Previous Conversation"
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
          onAction={previousConversation}
        />
        <Action
          icon={Icon.ArrowDown}
          title="Next Conversation"
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
          onAction={nextConversation}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Danger Zone">
        <Action
          icon={Icon.RotateClockwise}
          title="Reset Chat"
          shortcut={{ modifiers: ["opt", "shift"], key: "delete" }}
          onAction={resetConversation}
          style={Action.Style.Destructive}
        />
        <Action
          icon={Icon.Trash}
          title="Delete Current Conversation"
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
          onAction={deleteConversation}
          style={Action.Style.Destructive}
        />
        <Action
          icon={Icon.XMarkCircle}
          title="Purge Google Bard"
          onAction={purgeLocalStorage}
          style={Action.Style.Destructive}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  // Formats date and time, if time more than 1 day from current, then just returns date
  const formatDateTime = (timestamp) => {
    const currentDate = new Date();
    const inputDate = new Date(timestamp);

    return inputDate.getDate() === currentDate.getDate() &&
      inputDate.getMonth() === currentDate.getMonth() &&
      inputDate.getFullYear() === currentDate.getFullYear()
      ? `${inputDate.getHours().toString().padStart(2, "0")}:${inputDate.getMinutes().toString().padStart(2, "0")}`
      : `${(inputDate.getMonth() + 1).toString().padStart(2, "0")}/${inputDate
          .getDate()
          .toString()
          .padStart(2, "0")}/${inputDate.getFullYear()}`;
  };

  // Makes the dropdown to select conversations
  const ConversationDropdown = () => {
    return isLoaded ? (
      <List.Dropdown
        tooltip="Select conversation..."
        value={conversationName}
        onChange={async (newValue) => {
          setConversationName(newValue);
          // setCurrentBard(new Bard.Chat({
          //     ...getCurrentConversation(conversationList, newValue)?.ids
          // }));
          toast(Toast.Style.Success, `Set conversation to "${newValue}"`);
        }}
      >
        {conversationList.map(({ name }, i) => (
          <List.Dropdown.Item key={name + i} title={name} value={name} />
        ))}
      </List.Dropdown>
    ) : null;
  };

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Chat With AI"
      searchBarPlaceholder="Ask Bard something..."
      isShowingDetail={bardWorking && getCurrentConversation().questions.length !== 0}
      actions={<BardActionPanel />}
      searchBarAccessory={<ConversationDropdown />}
    >
      {(() => {
        // If not loaded, show loading screen
        if (!bardWorking) {
          return <List.EmptyView icon={Icon.WifiDisabled} title={"Bard failed to connect"} />;
        } else if (!isLoaded) {
          return <List.EmptyView icon={Icon.Stars} title={"Bard is loading..."} />;
        } else if (tryingToConnect && getCurrentConversation().questions.length === 0) {
          // If loaded but no questions submitted, show ready screen
          return <List.EmptyView icon={Icon.Clock} title={"Please wait."} />;
        } else if (getCurrentConversation().questions.length === 0) {
          // If loaded but no questions submitted, show ready screen
          return <List.EmptyView icon={Icon.Stars} title={"Ask away. Bard is ready."} />;
        } else {
          // Otherwise, show list of conversations with details
          return getCurrentConversation().questions.map(({ question, response, metadata }, i) => (
            <List.Item
              accessories={[{ text: `${formatDateTime(metadata.date)}` }]}
              key={question + i}
              title={question}
              actions={<BardActionPanel response={response} />}
              detail={<List.Item.Detail markdown={`**${question}**\n\n${response}`} />}
            />
          ));
        }
      })()}
    </List>
  );
}
