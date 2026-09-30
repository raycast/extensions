import { executeFFprobeCommand } from "./execute";

type FFProbeData = {
  streams: FFProbeStream[];
  format: FFProbeFormat;
};

type FFProbeFormat = {
  duration: number;
  bit_rate: number;
};

type FFProbeStream = {
  codec_type: string;
  bit_rate: string | null;
  duration: string | null;
  codec_long_name: string;
  profile: string | null;
  codec_tag_string: string;
  codec_tag: string;
  width: string;
  height: string;
  color_space: string | null;
  color_range: string | null;
  r_frame_rate: string;
  bits_per_raw_sample: string | null;
  sample_rate: string;
  channels: string;
};

export type SectionList = Array<SectionListItem>;

type SectionListItem = {
  title: string;
  type: "video" | "audio" | "other";
  data: Array<{ title: string; value: string }>;
};

function formatNumberWithCommas(num: number | string): string {
  num = Number(num);
  if (isNaN(num)) return num.toString();
  const numReversed = num.toString().split("").reverse();
  const formattedNumReversed = numReversed
    .map((digit, index) => (index % 3 === 2 && index !== numReversed.length - 1 ? `${digit},` : digit))
    .join("");

  return formattedNumReversed.split("").reverse().join("");
}

function parseFFProbeOutputToData(ffprobeOutput: FFProbeData) {
  const videoSections: SectionListItem[] = [];
  const audioSections: SectionListItem[] = [];

  let videoStreams = ffprobeOutput.streams;
  videoStreams = videoStreams.filter((stream) => stream.codec_type === "video");

  let audioStreams = ffprobeOutput.streams;
  audioStreams = audioStreams.filter((stream) => stream.codec_type === "audio");

  videoStreams.forEach((stream, index) => {
    const bit_rate = Number(stream["bit_rate"]) || Number(ffprobeOutput.format.bit_rate) || 0;
    const bitRateInMbit = bit_rate / 1048576;

    const durationInSeconds = Number(stream["duration"]) || Number(ffprobeOutput.format.duration) || 0;

    const codec_string =
      (stream["codec_tag_string"] !== "[0][0][0][0]"
        ? `(${stream["codec_tag_string"]} / ${stream["codec_tag"]})`
        : "") || "";

    const profile = stream["profile"] ? `(${stream["profile"]})` : "";

    const fps = Number(stream["r_frame_rate"].split("/")[0]) / Number(stream["r_frame_rate"].split("/")[1]);

    const videoSection = {} as SectionListItem;
    videoSection.title = `Video Stream ${index + 1}`;
    videoSection.type = "video";

    const videoData = [] as Array<{ title: string; value: string }>;

    if (durationInSeconds > 1) {
      videoData.push({ title: "Duration", value: `${Math.floor(durationInSeconds)}s` });
    }

    videoData.push({
      title: "Encoding",
      value: `${stream["codec_long_name"]} ${profile} ${codec_string}`,
    });
    videoData.push({ title: "Resolution", value: `${stream["width"]}x${stream["height"]}` });

    if (stream["color_space"]) {
      videoData.push({ title: "Color Space", value: `${stream["color_space"]}` });
    }

    if (stream["color_range"]) {
      videoData.push({ title: "Color Range", value: `${stream["color_range"]}` });
    }

    videoData.push({ title: "FPS", value: `${Math.round(fps)}` });

    if (stream["bits_per_raw_sample"]) {
      videoData.push({ title: "Bits Per Raw Sample", value: `${stream["bits_per_raw_sample"]}` });
    }

    videoData.push({
      title: "Bit Rate",
      value: `${bitRateInMbit.toFixed(2)} Mbit/s (${formatNumberWithCommas(bit_rate)} bit)`,
    });

    videoSection.data = videoData;
    videoSections.push(videoSection);
  });

  audioStreams.forEach((stream, index) => {
    const bit_rate = Number(stream["bit_rate"]) || Number(ffprobeOutput.format.bit_rate) || 0;
    const bitRateInMbit = bit_rate / 1048576;

    const durationInSeconds = Number(stream["duration"]) || Number(ffprobeOutput.format.duration) || 0;

    const codec_string =
      (stream["codec_tag_string"] !== "[0][0][0][0]"
        ? `(${stream["codec_tag_string"]} / ${stream["codec_tag"]})`
        : "") || "";

    const audioSection = {} as SectionListItem;
    audioSection.title = `Audio Stream ${index + 1}`;
    audioSection.type = "audio";

    const audioData = [] as Array<{ title: string; value: string }>;
    audioData.push({ title: "Duration", value: `${Math.floor(durationInSeconds)}s` });
    audioData.push({
      title: "Encoding",
      value: `${stream["codec_long_name"]} (${stream["profile"]}) ${codec_string}`,
    });
    audioData.push({ title: "Sampling Rate", value: `${stream["sample_rate"]}` });
    audioData.push({ title: "Audio Channels", value: `${stream["channels"]}` });
    audioData.push({
      title: "Bit Rate",
      value: `${bitRateInMbit.toFixed(2)} Mbit/s (${formatNumberWithCommas(bit_rate)} bit)`,
    });

    audioSection.data = audioData;
    audioSections.push(audioSection);
  });

  return [...videoSections, ...audioSections];
}

export function getFileInfoData(filePath: string) {
  filePath = filePath.split(" ").join(" ");
  const info = executeFFprobeCommand(`-v error -print_format json -show_format -show_streams "${filePath}"`);
  return parseFFProbeOutputToData(JSON.parse(info));
}

export function fileInfoDataToMarkdown(data: SectionList) {
  let markdownStr = "";

  data.forEach((section) => {
    markdownStr += `# ${section.title}\n\n`;
    section.data.forEach((item) => {
      markdownStr += `- ${item.title}: ${item.value}\n`;
    });
    markdownStr += "------\n\n";
  });

  return markdownStr;
}
