import { Icon, Color } from "@raycast/api";
import {
  Metadata,
  SourceStatus,
  SourceType,
  TimestampTuple,
  Notebook,
  Source,
  MetadataArray,
  NotebookResponse,
  NotebooksData,
  SourceData,
  SummaryResponse,
  SummaryData,
  SummaryContent,
} from "../types";

export function getIcon(source_type: SourceType, status: SourceStatus) {
  if (status === SourceStatus.Upload_Prevented) {
    return {
      source: Icon.ExclamationMark,
      tintColor: Color.Red,
    };
  }

  if (source_type === SourceType.Google_Docs) {
    return {
      source: "icons/article.png",
      tintColor: Color.Blue,
    };
  } else if (source_type === SourceType.Pasted_text) {
    return {
      source: "icons/description.png",
      tintColor: Color.Blue,
    };
  } else if (source_type === SourceType.Markdown) {
    return {
      source: "icons/markdown.png",
      tintColor: Color.Blue,
    };
  } else if (source_type === SourceType.Google_Slides) {
    return {
      source: "icons/drive_presentation.png",
      tintColor: Color.Yellow,
    };
  } else if (source_type === SourceType.PDF) {
    return {
      source: "icons/drive_pdf.png",
      tintColor: Color.Red,
    };
  } else if (source_type === SourceType.YouTube) {
    return {
      source: "icons/video_youtube.png",
      tintColor: Color.Red,
    };
  } else if (source_type === SourceType.Audio) {
    return {
      source: "icons/video_audio_call.png",
      tintColor: Color.Blue,
    };
  } else if (source_type === SourceType.Site) {
    return {
      source: "icons/web.png",
      tintColor: Color.Blue,
    };
  } else {
    return {
      source: Icon.Document,
    };
  }
}

export function transformMetadata(metadata: MetadataArray, status: SourceStatus) {
  const m: Metadata = {
    gdoc_id: metadata[0],
    word_count: metadata[1],
    create_time: transformTimestamp(metadata[2]),
    complete_info: metadata[3]
      ? {
          id: metadata[3][0],
          complete_time: transformTimestamp(metadata[3][1]),
        }
      : null,
    source_type: metadata[4],
  };

  m.icon = getIcon(m.source_type, status);

  if (status === SourceStatus.Success) {
    if (m.source_type === SourceType.YouTube && metadata[5]) {
      const youtubeInfo = metadata[5];
      m.youtube_info = {
        url: youtubeInfo[0],
        videoId: youtubeInfo[1],
        channelName: youtubeInfo[2],
      };
    } else if (m.source_type === SourceType.Site && metadata[7]) {
      m.site_url = metadata[7];
    } else if (m.gdoc_id) {
      m.site_url = ["https://docs.google.com/document/d/" + m.gdoc_id[0]];
    }
  }

  return m;
}

export function transformTimestamp(timestamp: TimestampTuple) {
  if (!timestamp) return "N/A";
  const [seconds, nanoseconds] = timestamp;
  const timestampMs = seconds * 1000 + Math.floor(nanoseconds / 1e6);
  const date = new Date(timestampMs);
  return date.toLocaleString();
}

export function transformNotebook(response: string): Notebook[] {
  const notebooks: Notebook[] = [];

  if (response === "null") {
    return notebooks;
  }

  const payload = JSON.parse(response)[0][0] as NotebookResponse[0];

  if (payload[0] === "wrb.fr") {
    const notebooksData = JSON.parse(payload[2]) as NotebooksData;
    if (notebooksData.length > 0) {
      notebooksData[0].forEach((notebook) => {
        // Convert array to object format for sources
        const sources_dict: Source[] = notebook[1]
          ? notebook[1].map((sourceData: SourceData) => {
              return {
                id: sourceData[0][0],
                title: sourceData[1],
                metadata: transformMetadata(sourceData[2], sourceData[3][1]),
                status: sourceData[3][1],
              };
            })
          : [];

        notebooks.push({
          title: notebook[0],
          sources: sources_dict,
          id: notebook[2],
          icon: notebook[3],
          owned: notebook[5][0],
          shared: notebook[5][1],
          created_at: transformTimestamp(notebook[5][5]),
        });
      });
    }
  }

  return notebooks;
}

export function transformSummaries(response: string): Array<SummaryContent | null> {
  if (!response || response === "null") {
    return [];
  }

  const payloads = JSON.parse(response) as SummaryResponse;
  const summaries: Array<SummaryContent | null> = [];

  for (const payload of payloads) {
    if (!payload) {
      summaries.push(null);
      continue;
    }

    const items = payload.filter((item) => item[0] === "wrb.fr");

    if (items.length > 0 && items[0][2]) {
      try {
        const content = JSON.parse(items[0][2]) as SummaryData;
        const summaryData = content[0][0];

        summaries.push({
          topics: summaryData[2][0] || [],
          summary: summaryData[1][0] || "",
          recommended_questions: summaryData[3][0] || [],
        });
      } catch (e) {
        console.error("Failed to parse summary content", e);
        summaries.push(null);
      }
    } else {
      summaries.push(null);
    }
  }

  return summaries;
}

export function formatMarkdown(title: string, summary: string) {
  if (summary) {
    const summary_content = JSON.parse(summary) as SummaryContent;
    const topics = summary_content.topics?.map((topic: string) => `\`${topic}\``).join(" ");
    const recommended_questions =
      summary_content.recommended_questions?.map((question: string) => `- ${question}`).join("\n") || "- None";
    return `## ${title}\n\n${topics}\n\n${summary_content.summary}\n\n## Recommended Questions\n\n${recommended_questions}`;
  }
  return `## ${title}\n\nSummary is loading...`;
}

export function formatNavigationTitle(notebook: Notebook | null) {
  return notebook?.id ? (notebook.icon ? notebook.icon + " " + notebook.title : notebook.title) : "New Notebook";
}
