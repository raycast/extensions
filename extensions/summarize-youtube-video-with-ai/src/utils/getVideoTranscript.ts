import { popToRoot, showToast, Toast } from "@raycast/api";

function extractVideoId(video: string): string {
  if (video.includes("youtube.com/watch?v=")) {
    return video.split("v=")[1].split("&")[0];
  }
  if (video.includes("youtu.be/")) {
    return video.split("youtu.be/")[1].split("?")[0];
  }
  return video;
}

export async function getVideoTranscript(video: string): Promise<string | undefined> {
  try {
    const videoId = extractVideoId(video);
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const videoPageResponse = await fetch(videoPageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    const videoPageHtml = await videoPageResponse.text();

    let transcriptEndpointMatch = videoPageHtml.match(
      /"transcriptEndpoint":\{"getTranscriptEndpoint":\{"videoId":"[^"]+","params":"([^"]+)"/,
    );

    if (!transcriptEndpointMatch) {
      transcriptEndpointMatch = videoPageHtml.match(/"getTranscriptEndpoint":[^}]*"params":"([^"]+)"/);
    }

    if (!transcriptEndpointMatch) {
      const possibleParams = videoPageHtml.match(/"params":"([A-Za-z0-9+/=%]{20,})"/g);

      if (possibleParams && possibleParams.length > 0) {
        for (const paramString of possibleParams) {
          const paramMatch = paramString.match(/"params":"([^"]+)"/);
          if (paramMatch) {
            const param = paramMatch[1];
            const paramIndex = videoPageHtml.indexOf(paramString);
            const contextBefore = videoPageHtml.substring(Math.max(0, paramIndex - 200), paramIndex);
            const contextAfter = videoPageHtml.substring(paramIndex, Math.min(videoPageHtml.length, paramIndex + 200));

            if (
              contextBefore.includes("transcript") ||
              contextAfter.includes("transcript") ||
              contextBefore.includes("caption") ||
              contextAfter.includes("caption")
            ) {
              transcriptEndpointMatch = [paramString, param];
              break;
            }
          }
        }

        if (!transcriptEndpointMatch) {
          const paramMatch = possibleParams[0].match(/"params":"([^"]+)"/);
          if (paramMatch) {
            transcriptEndpointMatch = [possibleParams[0], paramMatch[1]];
          }
        }
      }
    }

    if (!transcriptEndpointMatch) {
      showToast({
        style: Toast.Style.Failure,
        title: "❗",
        message: "Sorry, this video doesn't have a transcript.",
      });
      popToRoot();
      return undefined;
    }

    const apiKeyMatch = videoPageHtml.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    const apiKey = apiKeyMatch ? apiKeyMatch[1] : "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

    const transcriptParams = transcriptEndpointMatch[1];
    const transcriptUrl = `https://www.youtube.com/youtubei/v1/get_transcript?key=${apiKey}`;

    const transcriptPayload = {
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20240101.00.00",
        },
      },
      params: transcriptParams,
    };

    const transcriptResponse = await fetch(transcriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Origin: "https://www.youtube.com",
        Referer: `https://www.youtube.com/watch?v=${videoId}`,
      },
      body: JSON.stringify(transcriptPayload),
    });

    if (!transcriptResponse.ok) {
      throw new Error(`Transcript API returned ${transcriptResponse.status}`);
    }

    const transcriptData = (await transcriptResponse.json()) as Record<string, unknown>;
    const actions = transcriptData?.actions as Array<Record<string, unknown>> | undefined;
    const transcriptBody = actions?.[0]?.updateEngagementPanelAction as Record<string, unknown> | undefined;
    const content = transcriptBody?.content as Record<string, unknown> | undefined;
    const transcriptRenderer = content?.transcriptRenderer as Record<string, unknown> | undefined;
    const transcriptContent = transcriptRenderer?.content as Record<string, unknown> | undefined;

    let transcriptBodyRenderer = transcriptContent?.transcriptBodyRenderer as Record<string, unknown> | undefined;

    if (!transcriptBodyRenderer) {
      const searchPanelRenderer = transcriptContent?.transcriptSearchPanelRenderer as
        | Record<string, unknown>
        | undefined;
      const body = searchPanelRenderer?.body as Record<string, unknown> | undefined;
      transcriptBodyRenderer = body?.transcriptSegmentListRenderer as Record<string, unknown> | undefined;

      if (!transcriptBodyRenderer) {
        transcriptBodyRenderer = searchPanelRenderer?.footer as Record<string, unknown> | undefined;
      }
    }

    if (!transcriptBodyRenderer?.cueGroups && !transcriptBodyRenderer?.initialSegments) {
      showToast({
        style: Toast.Style.Failure,
        title: "❗",
        message: "Sorry, this video doesn't have a transcript.",
      });
      popToRoot();
      return undefined;
    }

    let transcriptText = "";

    if (transcriptBodyRenderer.initialSegments) {
      const initialSegments = transcriptBodyRenderer.initialSegments as Array<Record<string, unknown>>;

      transcriptText = initialSegments
        .map((segment: Record<string, unknown>) => {
          const transcriptSegmentRenderer = segment.transcriptSegmentRenderer as Record<string, unknown> | undefined;
          const snippet = transcriptSegmentRenderer?.snippet as Record<string, unknown> | undefined;
          const runs = snippet?.runs as Array<Record<string, unknown>> | undefined;

          return runs?.map((run: Record<string, unknown>) => (run.text as string) || "").join("") || "";
        })
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    } else if (transcriptBodyRenderer.cueGroups) {
      const cueGroups = transcriptBodyRenderer.cueGroups as Array<Record<string, unknown>>;
      transcriptText = cueGroups
        .map((cueGroup: Record<string, unknown>) => {
          const renderer = cueGroup.transcriptCueGroupRenderer as Record<string, unknown> | undefined;
          const cues = renderer?.cues as Array<Record<string, unknown>> | undefined;
          return (
            cues
              ?.map((cue: Record<string, unknown>) => {
                const cueRenderer = cue.transcriptCueRenderer as Record<string, unknown> | undefined;
                const cueData = cueRenderer?.cue as Record<string, unknown> | undefined;
                return (cueData?.simpleText as string) || "";
              })
              .join(" ") || ""
          );
        })
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    }

    if (!transcriptText) {
      showToast({
        style: Toast.Style.Failure,
        title: "❗",
        message: "Sorry, this video doesn't have a transcript.",
      });
      popToRoot();
      return undefined;
    }

    return transcriptText;
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: "❗",
      message: "Sorry, this video doesn't have a transcript.",
    });
    popToRoot();
    return undefined;
  }
}
