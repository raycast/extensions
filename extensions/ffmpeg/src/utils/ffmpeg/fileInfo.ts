import { executeFFprobeCommand } from "./execute";

type FFProbeStream = {
  [key: string]: string | number;
};

export type SectionList = Array<{
  title: string;
  type: "video" | "audio" | "other";
  data: Array<{ title: string; value: string }>;
}>;

function formatNumberWithCommas(num: number | string): string {
  num = Number(num);
  if (isNaN(num)) return num.toString();
  const numReversed = num.toString().split("").reverse();
  const formattedNumReversed = numReversed
    .map((digit, index) => (index % 3 === 2 && index !== numReversed.length - 1 ? `${digit},` : digit))
    .join("");

  return formattedNumReversed.split("").reverse().join("");
}

function parseFFProbeOutput(ffprobeOutput: string) {
  const streamPattern = /\[STREAM\]([\s\S]*?)\[\/STREAM\]/g;
  let match: RegExpExecArray | null;

  const videoStreams: FFProbeStream[] = [];
  const audioStreams: FFProbeStream[] = [];

  while ((match = streamPattern.exec(ffprobeOutput)) !== null) {
    const parsedStream: FFProbeStream = {};

    match[1].split("\n").forEach((line) => {
      if (line) {
        const [key, value] = line.split("=").map((v) => v.trim());
        parsedStream[key] = isNaN(parseFloat(value)) ? value : parseFloat(value);
      }
    });

    // 根据编码类型分组
    if (parsedStream["codec_type"] === "video") {
      videoStreams.push(parsedStream);
    } else if (parsedStream["codec_type"] === "audio") {
      audioStreams.push(parsedStream);
    }
  }

  // 将解析结果以 markdown 格式输出
  let markdownStr = "";

  videoStreams.forEach((stream, index) => {
    const bitRateInMbit = (stream["bit_rate"] as number) / 1048576;
    let durationInSeconds = stream["duration"] as number;
    if (!durationInSeconds || isNaN(durationInSeconds)) {
      durationInSeconds = 0;
    }
    markdownStr += `# 视频流信息 ${index + 1}\n
  - **时长**：${durationInSeconds.toFixed(2)}s
  - **编码**：${stream["codec_long_name"]} (${stream["profile"]}) (${stream["codec_tag_string"]} / ${
      stream["codec_tag"]
    })
  - **分辨率**: ${stream["width"]}x${stream["height"]}
  - **色彩空间**: ${stream["color_space"]}
  - **色彩范围**: ${stream["color_range"]}
  - **帧率**: ${stream["r_frame_rate"]}
  - **颜色深度**: ${stream["bits_per_raw_sample"]}
  - **比特率**: ${bitRateInMbit.toFixed(2)} Mbit/s (${formatNumberWithCommas(stream["bit_rate"])} bit)\n\n`;
  });

  audioStreams.forEach((stream, index) => {
    const bitRateInMbit = (stream["bit_rate"] as number) / 1048576;
    let durationInSeconds = stream["duration"] as number;
    if (!durationInSeconds || isNaN(durationInSeconds)) {
      durationInSeconds = 0;
    }
    markdownStr += `# 音频流信息 ${index + 1}\n
  - **时长**：${durationInSeconds.toFixed(2)}s
  -    **编码**: ${stream["codec_long_name"]} (${stream["profile"]}) (${stream["codec_tag_string"]} / ${
      stream["codec_tag"]
    })
  -    **采样率**: ${stream["sample_rate"]}
  -    **声道**: ${stream["channels"]}
  -    **比特率**: ${bitRateInMbit.toFixed(2)} Mbit/s (${formatNumberWithCommas(stream["bit_rate"])} bit)\n\n`;
  });

  return markdownStr;
}

function parseFFProbeOutputToData(ffprobeOutput: string) {
  const streamPattern = /\[STREAM\]([\s\S]*?)\[\/STREAM\]/g;
  let match: RegExpExecArray | null;

  const videoStreams: FFProbeStream[] = [];
  const audioStreams: FFProbeStream[] = [];

  const videoSections: SectionList = [];
  const audioSections: SectionList = [];

  while ((match = streamPattern.exec(ffprobeOutput)) !== null) {
    const parsedStream: FFProbeStream = {};

    match[1].split("\n").forEach((line) => {
      if (line) {
        const [key, value] = line.split("=").map((v) => v.trim());
        parsedStream[key] = isNaN(parseFloat(value)) ? value : parseFloat(value);
      }
    });

    // 根据编码类型分组
    if (parsedStream["codec_type"] === "video") {
      videoStreams.push(parsedStream);
    } else if (parsedStream["codec_type"] === "audio") {
      audioStreams.push(parsedStream);
    }
  }

  videoStreams.forEach((stream, index) => {
    const bitRateInMbit = (stream["bit_rate"] as number) / 1048576;
    const durationInSeconds = stream["duration"] as number;

    videoSections.push({
      title: `Video Stream ${index + 1}`,
      type: "video",
      data: [
        { title: "Duration", value: `${durationInSeconds.toFixed(2)}s` },
        {
          title: "Encoding",
          value: `${stream["codec_long_name"]} (${stream["profile"]}) (${stream["codec_tag_string"]} / ${stream["codec_tag"]})`,
        },
        { title: "Resolution", value: `${stream["width"]}x${stream["height"]}` },
        { title: "Color Space", value: `${stream["color_space"]}` },
        { title: "Color Range", value: `${stream["color_range"]}` },
        { title: "FPS", value: `${stream["r_frame_rate"]}` },
        { title: "Bits Per Raw Sample", value: `${stream["bits_per_raw_sample"]}` },
        {
          title: "Bit Rate",
          value: `${bitRateInMbit.toFixed(2)} Mbit/s (${formatNumberWithCommas(stream["bit_rate"])} bit)\n\n`,
        },
      ],
    });
  });

  audioStreams.forEach((stream, index) => {
    const bitRateInMbit = (stream["bit_rate"] as number) / 1048576;
    const durationInSeconds = stream["duration"] as number;

    audioSections.push({
      title: `Audio Stream ${index + 1}`,
      type: "audio",
      data: [
        { title: "Duration", value: `${durationInSeconds.toFixed(2)}s` },
        {
          title: "Encoding",
          value: ` ${stream["codec_long_name"]} (${stream["profile"]}) (${stream["codec_tag_string"]} / ${stream["codec_tag"]})`,
        },
        { title: "Sampling Rate", value: ` ${stream["sample_rate"]}` },
        { title: "Audio Channels", value: ` ${stream["channels"]}` },
        {
          title: "Bit Rate",
          value: ` ${bitRateInMbit.toFixed(2)} Mbit/s (${formatNumberWithCommas(stream["bit_rate"])} bit)\n\n`,
        },
      ],
    });
  });

  return [...videoSections, ...audioSections];
}

export function getFileInfo(filePath: string) {
  filePath = filePath.split(" ").join(" ");
  const info = executeFFprobeCommand(`-v error -show_format -show_streams "${filePath}"`);
  return parseFFProbeOutput(info);
}

export function getFileInfoData(filePath: string) {
  filePath = filePath.split(" ").join(" ");
  const info = executeFFprobeCommand(`-v error -show_format -show_streams "${filePath}"`);
  return parseFFProbeOutputToData(info);
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
