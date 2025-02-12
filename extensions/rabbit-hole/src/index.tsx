import { ActionPanel, Detail, List, Action } from "@raycast/api";
import { rabbitData } from "./utils/rabbitData";
import { timeAgo, formatDate } from "./utils/helpers";
import { disclaimer } from "./utils/consts";
import RemotePlay from "./remotePlay";
import RabbitAsset from "./rabbitAsset";

interface JournalEntry {
  _id: string;
  userId: string;
  createdOn: string;
  modifiedOn: string;
  archived: boolean;
  type: string;
  title: string;
  data: {
    reminderData?: {
      textContent: string;
    };
    memoryData?: {
      textContent: string;
    };
    betaRabbitData?: {
      titleImageUrl?: string;
      textContent: string;
    };
    magicCameraData?: {
      originalImage: {
        url: string;
      };
      aiGeneratedImages: {
        url: string;
      }[];
    };
    recordingData?: {
      textContent: string;
      files: {
        url: string;
        transcript?: string;
      }[];
    };
    noteData?: {
      textContent: string;
    };
    aiGeneratedImageData?: {
      textContent: string;
      files: {
        url: string;
      }[];
    };
    conversationData?: {
      textContent: string;
    };
    visionData?: {
      textContent: string;
      files: {
        url: string;
      }[];
    };
    searchData?: {
      textContent: string;
    };
  };
  utterance: {
    prompt: string;
    intention: string;
  };
}

interface Journal {
  journal: {
    entries: JournalEntry[];
  };
  profile: {
    name: string;
  };
}

interface JournalData {
  isLoading: boolean;
  data: Journal | null;
}

export default function Command() {
  const data = rabbitData("fetchUserJournal") as JournalData;
  if (data.isLoading) {
    return (
      <Detail isLoading={true} markdown={`Loading your journal... \n\n ![Rabbit Hole Loading](rabbit-r1-bunny.gif)`} />
    );
  }

  if (!data.data) {
    return <Detail markdown={`Failed to load your journal`} />;
  }

  const JournalItem = (item: JournalEntry) => {
    // set up header
    let markdown = item?.title ? `# ${item.title}` : "# Untitled Entry";
    markdown += item?.createdOn ? ` \n at ${formatDate(item.createdOn)}` : "";
    if (item?.type === "recording" || item?.type === "search" || item?.type === "conversation") {
      markdown += item?.utterance?.prompt ? ` _via voice prompt:_ "${item.utterance.prompt}" \n` : "\n";
    }
    markdown += `\n\n---\n`;

    // set up body and actions per type
    let journalActions = null;
    switch (item?.type) {
      case "recording":
        markdown += `\n## Summary: \n`;
        markdown += item.data?.recordingData?.textContent || "No summary available";
        markdown += `\n---\n ## Original Transcript: \n ${item.data?.recordingData?.files?.[0]?.transcript || "No transcript available"}`;
        journalActions = (
          <ActionPanel>
            {item.data?.recordingData?.files?.[0]?.url && (
              <RemotePlay file={item.data.recordingData.files[0].url as string} />
            )}
            {item.data?.recordingData?.textContent && (
              <Action.CopyToClipboard title="Copy Summarized Notes" content={item.data.recordingData.textContent} />
            )}
            {item.data?.recordingData?.files?.[0]?.transcript && (
              <Action.CopyToClipboard
                title="Copy Original Transcript"
                content={item.data.recordingData.files[0].transcript}
              />
            )}
          </ActionPanel>
        );
        break;
      case "note":
        markdown += item.data?.noteData?.textContent || "No note content available";
        journalActions = (
          <ActionPanel>
            {item.data?.noteData?.textContent && (
              <Action.CopyToClipboard title="Copy Note" content={item.data.noteData.textContent} />
            )}
          </ActionPanel>
        );
        break;
      case "conversation":
        markdown += item.data?.conversationData?.textContent || "No conversation content available";
        journalActions = (
          <ActionPanel>
            {item.data?.conversationData?.textContent && (
              <Action.CopyToClipboard
                title="Copy Conversation Response"
                content={item.data.conversationData.textContent}
              />
            )}
          </ActionPanel>
        );
        break;
      case "search":
        markdown += item.data?.searchData?.textContent || "No search results available";
        journalActions = (
          <ActionPanel>
            {item.data?.searchData?.textContent && (
              <Action.CopyToClipboard title="Copy Search Result" content={item.data.searchData.textContent} />
            )}
          </ActionPanel>
        );
        break;
      case "ai-generated-image":
        markdown += item.data?.aiGeneratedImageData?.textContent || "No image description available";
        if (item.data?.aiGeneratedImageData?.files?.[0]?.url) {
          markdown += RabbitAsset(item.data.aiGeneratedImageData.files[0].url);
        }
        markdown += disclaimer;
        journalActions = (
          <ActionPanel>
            {item.data?.aiGeneratedImageData?.textContent && (
              <Action.CopyToClipboard
                title="Copy Generated Image Description"
                content={item.data.aiGeneratedImageData.textContent}
              />
            )}
          </ActionPanel>
        );
        break;
      case "magic-camera":
        if (item.data?.magicCameraData?.aiGeneratedImages?.[0]?.url) {
          markdown += RabbitAsset(item.data.magicCameraData.aiGeneratedImages[0].url);
          markdown += "\n\n---\n\n";
        }
        if (item.data?.magicCameraData?.originalImage?.url) {
          markdown += RabbitAsset(item.data.magicCameraData.originalImage.url);
        }
        markdown += disclaimer || "";
        break;
      case "vision":
        if (item.data?.visionData?.files?.[0]?.url) {
          markdown += RabbitAsset(item.data.visionData.files[0].url);
          markdown += "\n\n";
        }
        markdown += item.data?.visionData?.textContent || "No vision analysis available";
        break;
      case "beta-rabbit":
        markdown += item.data?.betaRabbitData?.textContent || "No search results available";
        break;
      case "reminder":
        markdown += item.data?.reminderData?.textContent || "No reminder details available";
        break;
      case "search-memory":
        markdown += item.data?.memoryData?.textContent || "No results found in your journal";
        break;
      default:
        markdown += "Sorry, that intent type is not supported yet.";
    }

    // debugging
    // markdown += `\n\n---\n\n${JSON.stringify(item.data, null, 2)}`;

    return (
      <List.Item
        icon={`${item.type}.png`}
        key={item._id}
        title={item.title}
        subtitle={timeAgo(new Date(item.createdOn))}
        actions={journalActions}
        detail={<List.Item.Detail markdown={markdown} />}
      />
    );
  };

  return (
    <List isLoading={false} isShowingDetail={true}>
      {data.data.journal.entries.map((item: JournalEntry) => (
        <JournalItem key={item._id} {...item} />
      ))}
    </List>
  );
}
