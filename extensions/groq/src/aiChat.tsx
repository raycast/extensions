import {
  List,
  ActionPanel,
  Action,
  getPreferenceValues,
  Toast,
  showToast,
  Icon,
  Form,
  useNavigation,
  confirmAlert,
  LocalStorage,
  Alert,
} from "@raycast/api";
import { useState, useEffect, useCallback, useMemo } from "react";
import { global_model, enable_streaming, openai } from "./hook/configAPI";
import { ChatData, Message, Chats } from "./hook/AIChat.types";
import { currentDate } from "./hook/utils";
import { ChatCompletionMessageParam } from "openai/resources";
import { Stream } from "openai/streaming";

const model_override = getPreferenceValues<{ model_chat: string }>().model_chat;
const APIprovider = "Groq";

export default function Chat() {
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const model = useMemo(() => (model_override === "global" ? global_model : model_override), [model_override]);

  const updateChatData = useCallback((callback: (data: ChatData) => void) => {
    setChatData((oldData) => {
      if (!oldData) return oldData;
      callback(oldData);
      return { ...oldData };
    });
  }, []);

  const CreateChat = () => {
    const { pop } = useNavigation();

    const handleSubmit = (values: { chatName: string }) => {
      if (values.chatName === "") {
        showToast({ style: Toast.Style.Failure, title: "Chat must have a name." });
      } else if (chatData?.chats.map((x) => x.name).includes(values.chatName)) {
        showToast({ style: Toast.Style.Failure, title: "Chat with that name already exists." });
      } else {
        pop();
        updateChatData((data) => {
          data.chats.push({
            name: values.chatName,
            creationDate: new Date(),
            messages: [],
          });
          data.currentChat = values.chatName;
          return data;
        });
      }
    };

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Create Chat" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="chatName"
          title="Conversation Name"
          placeholder="Hawaii Trip"
          info={`In each chat, ${APIprovider} will remember the previous messages you send in it.`}
        />
      </Form>
    );
  };

  const handleSendMessage = async (query: string) => {
    if (searchText === "") {
      showToast({ style: Toast.Style.Failure, title: "Please Enter a Query" });
      return;
    }

    if (
      !chatData ||
      (getChat(chatData.currentChat).messages.length !== 0 && !getChat(chatData.currentChat).messages[0].finished)
    ) {
      showToast({ style: Toast.Style.Failure, title: "Please Wait", message: "Only one message at a time." });
      return;
    }

    setSearchText("");
    showToast({ style: Toast.Style.Animated, title: "Response Loading" });

    updateChatData((data) => {
      const currentChat = getChat(chatData.currentChat, data.chats);

      currentChat.messages.unshift({
        prompt: query,
        answer: "",
        creationDate: new Date().toISOString(),
        finished: false,
        modelName: model,
      });
      return data;
    });

    try {
      setIsLoading(true);
      const currentChat = getChat(chatData.currentChat);
      const messages = currentChat.messages.slice(0, 12).flatMap((x) => [ // only send the last 12 messages
        { role: "assistant", content: x.answer.substring(0, 1_000) }, // to avoid exceeding context size limit, only send first 1_000 characters of assistant response
        { role: "user", content: x.prompt },
      ]) as ChatCompletionMessageParam[];
      messages.push({
        role: "system",
        content: `Be a helpful chatbot that provides clear, concise, and accurate information to users, ensuring that your responses are easy to understand and directly address their questions. Current date is ${currentDate}.`,
      });
      messages.reverse();
      // messages.forEach((x) => {
      //   console.log(x.content);
      // });

      const response = await openai.chat.completions.create({
        model: model,
        messages: [...messages, { role: "user", content: query }],
        stream: enable_streaming,
      });

      let answer = "";
      if (response instanceof Stream) {
        for await (const message of response) {
          answer += message.choices[0].delta.content || "";
          updateChatData((data) => {
            getChat(chatData.currentChat, data.chats).messages[0].answer = answer;
            return data;
          });
        }
      } else {
        answer = response.choices[0]?.message?.content ?? "";
        updateChatData((data) => {
          getChat(chatData.currentChat, data.chats).messages[0].answer = answer;
          return data;
        });
      }

      updateChatData((data) => {
        getChat(chatData.currentChat, data.chats).messages[0].finished = true;
        return data;
      });

      showToast({ style: Toast.Style.Success, title: "Response Loaded" });
      setIsLoading(false);
    } catch (error) {
      console.error(`Error processing message with ${APIprovider}:`, error);
      updateChatData((data) => {
        getChat(chatData.currentChat, data.chats).messages.shift();
        return data;
      });
      showToast({
        style: Toast.Style.Failure,
        title: `${APIprovider} cannot process this message`,
        message: error as string,
      });
      setIsLoading(false);
    }
  };

  const OpenAIActionPanel = ({ answer, creationDate }: { answer?: string, creationDate?: string }) => (
    <ActionPanel>
      <Action icon={Icon.Message} title={`Send to ${APIprovider}`} onAction={() => handleSendMessage(searchText)} />
      {answer && <Action.CopyToClipboard title="Copy Answer" content={answer || ""} />}
      <ActionPanel.Section title="Manage Chats">
        <Action.Push
          icon={Icon.PlusCircle}
          title="Create Chat"
          target={<CreateChat />}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
        <Action
          icon={Icon.ArrowDown}
          title="Next Chat"
          onAction={() => navigateChat(1)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
        />
        <Action
          icon={Icon.ArrowUp}
          title="Previous Chat"
          onAction={() => navigateChat(-1)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Danger zone">
        {creationDate && (
          <Action
            icon={Icon.Trash}
            title="Delete Message"
            onAction={() => deleteMessage(creationDate)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
            style={Action.Style.Destructive}
          />
        )}
        <Action
          icon={Icon.Trash}
          title="Delete Conversation"
          onAction={deleteConversation}
          style={Action.Style.Destructive}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  const navigateChat = useCallback(
    (direction: number) => {
      if (!chatData) return;
      const chatIdx = chatData.chats.findIndex((chat) => chat.name === chatData.currentChat);
      const newIdx = chatIdx + direction;
      if (newIdx < 0 || newIdx >= chatData.chats.length) {
        showToast({ style: Toast.Style.Failure, title: `No Chats ${direction > 0 ? "After" : "Before"} Current` });
      } else {
        setChatData((oldData) => ({
          ...oldData!,
          currentChat: chatData.chats[newIdx].name,
        }));
      }
    },
    [chatData],
  );

  const deleteMessage = useCallback(async (message: string) => {
    setIsLoading(true);
    await confirmAlert({
      title: "Are you sure?",
      message: "You cannot recover this message.",
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete Message",
        style: Alert.ActionStyle.Destructive,
        onAction: () => {
          setChatData((oldData) => {
            if (!oldData) return oldData;
            const newChatData = structuredClone(oldData);
            const chatIdx = newChatData.chats.findIndex((chat) => chat.name === newChatData.currentChat);
            const messageIdx = newChatData.chats[chatIdx].messages.findIndex((msg) => msg.creationDate === message);
            if (messageIdx !== -1) {
              newChatData.chats[chatIdx].messages.splice(messageIdx, 1);
            }
            return newChatData;
          });
        },
      },
    });
    setIsLoading(false);
  }, []);

  const deleteConversation = async () => {
    setIsLoading(true);
    await confirmAlert({
      title: "Are you sure?",
      message: "You cannot recover this conversation.",
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete Chat",
        style: Alert.ActionStyle.Destructive,
        onAction: () => {
          if (!chatData) return;
          if (chatData.chats.length === 1) {
            showToast({ style: Toast.Style.Failure, title: "Cannot delete only conversation" });
            return;
          }
          const chatIdx = chatData.chats.findIndex((chat) => chat.name === chatData.currentChat);
          setChatData((oldData) => {
            if (!oldData) return oldData;
            const newChatData = structuredClone(oldData);
            newChatData.chats.splice(chatIdx, 1);
            newChatData.currentChat = newChatData.chats[Math.max(0, chatIdx - 1)].name;
            return newChatData;
          });
        },
      },
    });
    setIsLoading(false);
  };

  useEffect(() => {
    (async () => {
      const storedChatData = await LocalStorage.getItem("chatData");
      if (storedChatData) {
        const newData: ChatData = JSON.parse(storedChatData as string);

        if (getChat(newData.currentChat, newData.chats).messages[0]?.finished === false) {
          setIsLoading(true);
          const currentChat = getChat(newData.currentChat, newData.chats);
          const messages = currentChat.messages.map((x) => ({
            role: "user",
            content: x.prompt,
          })) as ChatCompletionMessageParam[];

          const response = await openai.chat.completions.create({
            model: model,
            messages: [...messages, { role: "user", content: currentChat.messages[0].prompt }],
            stream: enable_streaming,
          });

          let answer = "";
          if (response instanceof Stream) {
            for await (const message of response) {
              answer += message.choices[0].delta.content || "";
              updateChatData((newChatData) => {
                getChat(newData.currentChat, newChatData.chats).messages[0].answer = answer;
                return newChatData;
              });
            }
          } else {
            answer = response.choices[0]?.message?.content ?? "";
            updateChatData((newChatData) => {
              getChat(newData.currentChat, newChatData.chats).messages[0].answer = answer;
              return newChatData;
            });
          }

          updateChatData((newChatData) => {
            getChat(newData.currentChat, newChatData.chats).messages[0].finished = true;
            return newChatData;
          });

          showToast({ style: Toast.Style.Success, title: "Response Loaded" });
          setIsLoading(false);
        }

        // setChatData(structuredClone(newData));
        // add fake message to newData to test reliability of LocalStorage
        // newData.chats[0].messages.push({
        //   prompt: "Test",
        //   answer: "Spain! A country known for its rich history, stunning landscapes, vibrant culture, and warm hospitality. Located in southwestern Europe, Spain is a treasure trove of experiences waiting to be discovered. From the beautiful beaches of the Costa Brava to the artistic treasures of Madrid, Spain has something for everyone. **History and Architecture** Spain's history is as complex as it is fascinating. The country has been inhabited by various cultures, including the Celts, Romans, Visigoths, and Moors, each leaving their mark on the country's architecture, language, and customs. The Roman Empire's legacy can be seen in the ancient ruins of Tarragona, Mérida, and Segovia, while the Moorish influence is evident in the stunning Alhambra palace in Granada. The Gothic style is another prominent architectural trend in Spain, showcased in magnificent cathedrals like Santiago de Compostela and Burgos. The ornate decorations, intricate stone carvings, and soaring vaults are a testament to the country's rich cultural heritage. **Art and Culture** Spain is renowned for its world-class museums, showcasing the works of some of the greatest artists in history. The Prado Museum in Madrid is a must-visit, with an impressive collection of European art, including works by Velázquez, Goya, and El Greco. The Reina Sofia Museum, also in Madrid, is home to Picasso's iconic Guernica, while the Joan Miró Museum in Barcelona celebrates the life and works of the famous Catalan surrealist. Flamenco music and dance are an integral part of Spanish culture, with its passionate rhythms and graceful movements captivating audiences worldwide. The country is also famous for its vibrant festivals, such as the Tomatina tomato-throwing festival in Buñol and the Fallas celebrations in Valencia. **Cuisine** Spanish cuisine is a sensory delight, with its bold flavors, aromas, and textures. Tapas, those delicious small plates of food, are an integral part of the country's gastronomic culture. From patatas bravas (spicy fried potatoes) to croquetas (deep-fried balls filled with ham, fish, or chicken), tapas offer a taste sensation like no other. Paella, the iconic Spanish dish, is a staple of any visit to the country. This savory rice dish, originating from Valencia, is cooked with a variety of ingredients, including seafood, chorizo, and vegetables. Don't forget to try some gazpacho, a refreshing cold soup made from tomatoes, peppers, and cucumbers. **Regional Diversity** Spain is a country of diverse regions, each with its unique character and attractions. The autonomous communities of Catalonia, the Basque Country, and Galicia offer distinct cultural experiences, including their own languages, cuisines, and traditions. Andalusia, in southern Spain, is famous for its Moorish architecture, flamenco music, and beautiful beaches. The Costa del Sol, which stretches along the Mediterranean coast, is a popular destination for sun-seekers and golf enthusiasts. The Balearic Islands, comprising Ibiza, Mallorca, and Menorca, are a haven for partygoers, beach lovers, and nature enthusiasts. The Canary Islands, located off the northwest coast of Africa, boast stunning landscapes, volcanic peaks, and tropical forests. **Nature and Wildlife** Spain is home to some of the most breathtaking natural landscapes in Europe. The Pyrenees Mountains, which separate Spain from France, offer breathtaking scenery, ski resorts, and trekking opportunities. The Picos de Europa National Park in northern Spain is a haven for nature lovers, with its rugged mountains, valleys, and wildlife. The country is also home to some of the most stunning beaches in the world, such as the Costa Brava in Catalonia and the Costa del Sol in Andalusia. The beautiful islands of Ibiza and Mallorca are famous for their crystal-clear waters, secluded coves, and lively beach parties. **Cities** Madrid, the vibrant capital city, is a must-visit destination in Spain. From the world-class museums to the lively nightlife, Madrid offers something for everyone. The Royal Palace, Plaza Mayor, and the historic center are just a few of the many attractions this amazing city has to offer. Barcelona, the capital of Catalonia, is famous for its modernist architecture, beaches, and cultural attractions. The works of Antoni Gaudí, including the iconic Sagrada Família, are a major drawcard for visitors. The city's Gothic Quarter, La Rambla, and Barceloneta beach are other popular destinations. Seville, the charming capital of Andalusia, is known for its Moorish architecture, flamenco music, and delicious tapas. The Cathedral of Seville, Royal Alcázar Palace, and the Archivo de Indias are all UNESCO World Heritage Sites. **Festivals and Celebrations** Spain is a country that loves to celebrate, with numerous festivals and celebrations throughout the year. The Tomatina festival in Buñol, where participants throw tons of tomatoes at each other, is a world-famous event. The Fallas celebrations in Valencia, featuring giant puppets and fireworks, is another iconic festival. The Feria de Abril in Seville, the Feria de San Isidro in Madrid, and the Diada de Sant Jordi in Barcelona are other popular festivals, showcasing the country's love of music, dance, and fireworks. **Conclusion** Spain is a country that has something for everyone, from its rich history and culture to its stunning landscapes and vibrant cities. Whether you're interested in art, architecture, cuisine, or nature, Spain is a destination that will leave you enchanted and inspired. So come and experience the passion and warmth of this incredible country – you won't be disappointed!",
        //   creationDate: new Date().toISOString(),
        //   finished: true,
        //   modelName: model,
        // });

        setChatData(newData);
        
      } else {
        const newChatData: ChatData = {
          currentChat: "New Chat",
          chats: [
            {
              name: "New Chat",
              creationDate: new Date(),
              modelName: model,
              messages: [],
            },
          ],
        };
        await LocalStorage.setItem("chatData", JSON.stringify(newChatData));
        setChatData(newChatData);
      }
    })();
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (chatData) {
      (async () => {
        await LocalStorage.setItem("chatData", JSON.stringify(chatData));
      })();
    }
  }, [chatData]);

  const getChat = useCallback(
    (target: string, customChat: Chats[] = chatData!.chats): Chats => {
      const chat = customChat.find((chat) => chat.name === target);
      if (!chat) throw new Error("Chat not found");
      return chat;
    },
    [chatData],
  );

  return chatData === null ? (
    <List searchText={searchText} onSearchTextChange={setSearchText} isLoading={isLoading}>
      <List.EmptyView icon={Icon.Stars} title={`Send a Message to ${APIprovider} to get started.`} />
    </List>
  ) : (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={getChat(chatData.currentChat).messages.length > 0}
      searchBarPlaceholder={`Ask ${APIprovider}...`}
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Your Chats"
          onChange={(newValue) => {
            setChatData((oldData) => ({
              ...oldData!,
              currentChat: newValue,
            }));
          }}
          value={chatData.currentChat}
        >
          {chatData.chats.map((x) => (
            <List.Dropdown.Item title={x.name} value={x.name} key={x.name} />
          ))}
        </List.Dropdown>
      }
    >
      {getChat(chatData.currentChat).messages.length === 0 ? (
        <List.EmptyView
          icon={Icon.Stars}
          title={`Send a Message to ${APIprovider} to get started.`}
          actions={<OpenAIActionPanel />}
        />
      ) : (
        getChat(chatData.currentChat).messages.map((x, index) => (
          <List.Item
            title={{ tooltip: x.prompt, value: x.prompt }}
            // subtitle={`#${index + 1}`}
            accessories={[
              {
                date: new Date(x.creationDate),
                tooltip: `Message sent on: ${new Date(x.creationDate).toLocaleString()}`,
              },
            ]}
            detail={<List.Item.Detail markdown={`\`\`\`${x.modelName}\`\`\`\n\n${x.answer}`} isLoading={isLoading} />}
            key={x.prompt + x.creationDate}
            actions={<OpenAIActionPanel answer={x.answer} creationDate={x.creationDate}/>}
          />
        ))
      )}
    </List>
  );
}
