import { useState, useEffect } from "react";
import { Stream } from "../types";
import { millisecondsToTimecode } from "../utils";

export function useStreamData(stream: Stream) {
  const [viewOffset, setViewOffset] = useState(stream.view_offset);

  useEffect(() => {
    if (stream.state !== "playing") {
      return;
    }

    setViewOffset(stream.view_offset);
    const timeIncrementInterval = setInterval(() => {
      setViewOffset((prevOffset) => String(Number(prevOffset) + 1000));
    }, 1000);

    return () => {
      clearInterval(timeIncrementInterval);
    };
  }, [stream.state, stream.view_offset]);

  const duration = millisecondsToTimecode(stream.duration);
  const progress = millisecondsToTimecode(viewOffset);

  const isTranscoding = stream.stream_video_decision === "transcode";
  const transcodeSpeedLabel = isTranscoding
    ? stream.throttled === "1"
      ? " (throttled)"
      : ` (${stream.transcode_speed}x)`
    : "";

  const streamBitrate = (+stream.stream_bitrate / 1000).toFixed(1);
  const streamBitrateText = stream.stream_bitrate ? `${streamBitrate} mbps` : "Unknown";

  const videoSource = `${stream.video_codec.toUpperCase()} (${stream.transcode_hw_decoding ? "hw" : "cpu"}) ${stream.video_full_resolution} ${stream.video_dynamic_range}`;
  const videoTarget = `${stream.stream_video_codec.toUpperCase()} (${stream.transcode_hw_encoding ? "hw" : "cpu"}) ${stream.stream_video_full_resolution} ${stream.stream_video_dynamic_range}`;

  const audioSource = `${stream.audio_codec.toUpperCase()} ${stream.audio_channel_layout}`;
  const audioTarget = `${stream.stream_audio_codec.toUpperCase()} ${stream.stream_audio_channel_layout} (${stream.stream_audio_decision})`;

  const videoText = isTranscoding
    ? `${videoSource} → ${videoTarget}`
    : `Direct Stream (${stream.video_codec.toUpperCase()} ${stream.video_full_resolution} ${stream.video_dynamic_range})`;

  const audioText =
    stream.audio_decision === "transcode"
      ? `${audioSource} → ${audioTarget}`
      : `Direct Stream (${stream.audio_codec.toUpperCase()} ${stream.audio_channel_layout})`;

  return {
    duration,
    progress,
    isTranscoding,
    transcodeSpeedLabel,
    streamBitrate,
    streamBitrateText,
    videoSource,
    videoTarget,
    audioSource,
    audioTarget,
    videoText,
    audioText,
    stream,
  };
}

export type StreamData = ReturnType<typeof useStreamData>;
