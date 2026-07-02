import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { mobileApi } from "./moviebox";
import { detectPlayer, launchPlayer, extractStreamUrl } from "./utils";

interface PlayFormProps {
  initialSubjectId: string;
  season?: number;
  episode?: number;
  isSeries: boolean;
  initialResolution: string;
  dubs?: { subjectId: string; lanName: string }[];
  availableResolutions: { resolution: number }[];
}

interface Subtitle {
  url: string;
  lan: string;
  lanName: string;
}

export default function PlayForm(props: PlayFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [subjectId, setSubjectId] = useState(props.initialSubjectId);
  const [resolution, setResolution] = useState<string>(
    props.availableResolutions.length > 0
      ? props.availableResolutions[
          props.availableResolutions.length - 1
        ].resolution.toString()
      : "1080",
  );

  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>("");

  useEffect(() => {
    let isCancelled = false;
    async function loadResourceAndCaptions() {
      setIsLoading(true);
      try {
        const streamData = await mobileApi.getResource(
          subjectId,
          parseInt(resolution),
          props.season || 0,
          props.episode || 0,
        );
        const stream = streamData?.list?.[0] || streamData?.items?.[0];

        if (stream && stream.resourceId && !isCancelled) {
          const captionData = await mobileApi.getCaptions(
            subjectId,
            stream.resourceId,
          );
          if (captionData && captionData.extCaptions) {
            setSubtitles(captionData.extCaptions);
            const en = captionData.extCaptions.find(
              (c: Subtitle) => c.lan === "en" || c.lanName === "English",
            );
            if (en) setSelectedSubtitle(en.url);
            else if (captionData.extCaptions.length > 0)
              setSelectedSubtitle(captionData.extCaptions[0].url);
          } else {
            setSubtitles([]);
          }
        }
      } catch (e) {
        console.error("Failed to load captions", e);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadResourceAndCaptions();
    return () => {
      isCancelled = true;
    };
  }, [subjectId, resolution, props.season, props.episode]);

  async function handlePlay() {
    try {
      const player = detectPlayer();
      setIsLoading(true);
      showToast(Toast.Style.Animated, "Starting stream...");

      const streamData = await mobileApi.getResource(
        subjectId,
        parseInt(resolution),
        props.season || 0,
        props.episode || 0,
      );
      const streamUrl = extractStreamUrl(streamData);

      await launchPlayer(player, streamUrl, selectedSubtitle || undefined);
      showToast(Toast.Style.Success, `Playing in ${player}`);
      popToRoot();
    } catch (error) {
      const err = error as Error;
      showToast(Toast.Style.Failure, "Playback Failed", err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Play Now" onSubmit={handlePlay} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="dub"
        title="Audio Language"
        value={subjectId}
        onChange={setSubjectId}
      >
        {props.dubs?.map((dub) => (
          <Form.Dropdown.Item
            key={dub.subjectId}
            value={dub.subjectId}
            title={dub.lanName}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="resolution"
        title="Quality"
        value={resolution}
        onChange={setResolution}
      >
        {props.availableResolutions.map((res) => (
          <Form.Dropdown.Item
            key={res.resolution}
            value={res.resolution.toString()}
            title={`${res.resolution}p`}
          />
        ))}
      </Form.Dropdown>

      {subtitles.length > 0 && (
        <Form.Dropdown
          id="subtitle"
          title="Subtitle"
          value={selectedSubtitle}
          onChange={setSelectedSubtitle}
        >
          <Form.Dropdown.Item value="" title="None" />
          {subtitles.map((sub) => (
            <Form.Dropdown.Item
              key={sub.url}
              value={sub.url}
              title={sub.lanName || sub.lan}
            />
          ))}
        </Form.Dropdown>
      )}

      {subtitles.length === 0 && !isLoading && (
        <Form.Description
          title="Subtitles"
          text="No subtitles available or still loading..."
        />
      )}
    </Form>
  );
}
