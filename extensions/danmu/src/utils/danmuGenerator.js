import fs from "fs";
import { environment } from "@raycast/api";
import { execFileSync } from "child_process";
import axios from "axios";
import crypto from "crypto";
import path from "path";
import chardet from "chardet";

const pathToFfmpeg = `${environment.assetsPath}/ffmpeg`;
const pathToFfprobe = `${environment.assetsPath}/ffprobe`;

const addExecutePermission = (filePath) => {
  fs.chmod(filePath, 0o755, (err) => {
    if (err) {
      console.error(`Cannot Adding Execution Privileges: ${filePath}`, err);
    } else {
      console.log(`Adding Execution Privileges: ${filePath}`);
    }
  });
};
addExecutePermission(pathToFfmpeg);
addExecutePermission(pathToFfprobe);

function calculateMd5OfFirst16MB(filePath) {
  const md5 = crypto.createHash("md5");
  const size16MB = 16 * 1024 * 1024;

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { start: 0, end: size16MB - 1 });

    stream.on("data", (chunk) => {
      md5.update(chunk);
    });

    stream.on("end", () => {
      resolve(md5.digest("hex"));
    });

    stream.on("error", (err) => {
      reject(err);
    });
  });
}

// Get video duration
function getVideoDuration(filePath) {
  const command = [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ];

  try {
    const durationStr = execFileSync(pathToFfprobe, command, { encoding: "utf-8" });
    const duration = parseFloat(durationStr.trim());

    return Math.round(duration);
  } catch (error) {
    return null; // return null if failed
  }
}

function getFileSize(filePath) {
  return fs.statSync(filePath).size;
}

function getTitleFromNfo(filePath) {
  const nfoFile = path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}.nfo`);
  if (fs.existsSync(nfoFile)) {
    const nfoContent = fs.readFileSync(nfoFile, "utf-8");
    const titleMatch = nfoContent.match(/<title>(.*)<\/title>/);
    if (titleMatch) {
      console.log("Extract title from NFO - " + titleMatch[1]);
      return titleMatch[1];
    } else {
      console.error("cannot find title - " + filePath);
      return null;
    }
  }
  return null;
}
/**
 * 获取评论 ID
 * @param {string} filePath - 文件的路径
 * @returns {Promise<[boolean, [string, string] | null , string | null]>} 返回一个 Promise，解析为一个包含两个元素的数组：
 *          - 第一个元素是一个布尔值，表示是否成功。
 *          - 第二个元素是一个包含两个元素的数组，第一个元素是可能的匹配标题，第二个元素是可能的匹配 ID。
 *          - 第三个元素如果匹配成功的话是ID，否则是标题
 */
async function getCommentID(filePath) {
  const url = "https://api.dandanplay.net/api/v2/match";
  const hash = await calculateMd5OfFirst16MB(filePath);
  const name = path.basename(filePath);
  let info;

  try {
    const size = getFileSize(filePath);
    const duration = Math.floor(getVideoDuration(filePath));
    info = {
      fileName: name,
      fileHash: hash,
      fileSize: size,
      videoDuration: duration,
      matchMode: "hashAndFileName",
    };
  } catch (error) {
    console.error("获取文件信息失败");
    info = {
      fileName: name,
      fileHash: hash,
      fileSize: 0,
      videoDuration: 0,
      matchMode: "hashAndFileName",
    };
  }

  try {
    const response = await axios.post(url, info, {
      headers: {
        Accept: "application/json",
      },
    });
    if (response.status === 200 && response.data.isMatched) {
      return [true, [], response.data.matches[0].episodeId];
    } else {
      console.error(`未找到匹配 - ${filePath}`);
      const title = getTitleFromNfo(filePath);
      var titles = [];
      var ids = [];
      if (title) {
        console.log("尝试从标题匹配");
        for (const match of response.data.matches) {
          const episodeTitle = match.episodeTitle.replace(/第\d+话 /, "");
          const animeTitle = match.animeTitle;
          console.log(`${episodeTitle} - ${match.episodeId}`);
          if (episodeTitle === title) {
            console.log("匹配成功 - " + filePath);
            return [true, null, match.episodeId];
          }
          titles.push(animeTitle + ": " + episodeTitle);
          ids.push(match.episodeId);
        }
        console.log("未找到匹配，跳过 - " + filePath);
      }
      return [false, [titles, ids], title];
    }
  } catch (error) {
    console.error(`获取弹幕ID失败: ${error.message}`);
    return [false, null, null];
  }
}

// 获取评论
async function getComments(commentID) {
  console.log(`获取弹幕 - ${commentID}`);
  const url = `https://api.dandanplay.net/api/v2/comment/${commentID}?withRelated=true`;
  try {
    const response = await axios.get(url, {
      headers: {
        Accept: "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error(`获取弹幕失败: ${error.message}`);
    return null;
  }
}

// 转换时间戳
function convertTimestamp(timestamp) {
  timestamp = Math.round(timestamp * 100.0);
  const hour = Math.floor(timestamp / 360000);
  timestamp %= 360000;
  const minute = Math.floor(timestamp / 6000);
  timestamp %= 6000;
  const second = Math.floor(timestamp / 100);
  const centsecond = timestamp % 100;
  return `${hour}:${minute.toString().padStart(2, "0")}:${second.toString().padStart(2, "0")}.${centsecond.toString().padStart(2, "0")}`;
}

// 写入 ASS 文件头
function writeAssHead(f, width, height, fontface, fontsize, alpha, styleid) {
  f.write(
    `[Script Info]
; Script generated by Raycast Danmu Extension
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
Aspect Ratio: ${width}:${height}
Collisions: Normal
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ${styleid}, ${fontface}, ${fontsize.toFixed(0)}, &H${(alpha * 255) | 0}FFFFFF, &H${(alpha * 255) | 0}FFFFFF, &H${(alpha * 255) | 0}000000, &H${(alpha * 255) | 0}000000, 0, 0, 0, 0, 100, 100, 0.00, 0.00, 1, ${(fontsize / 25.0) | 0}, 0, 7, 0, 0, 0, 0

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`,
  );
}

// 转换评论为 ASS 格式
function convertCommentsToAss(
  comments,
  outputFile,
  width = 1920,
  height = 1080,
  fontface = "Arial",
  fontsize = 50,
  alpha = 0.8,
  duration = 10,
) {
  const styleid = "Danmu";

  const findNonOverlappingTrack = (tracks, currentTime, maxTracks) => {
    let possibleTrack = 1;
    let lastTimeRemain = 100;
    for (let track = 1; track <= maxTracks; track++) {
      if (!(track in tracks) || currentTime >= tracks[track]) {
        return track;
      } else {
        const timeRemain = tracks[track] - currentTime;
        if (timeRemain > lastTimeRemain) {
          possibleTrack = track;
        }
      }
    }
    return possibleTrack;
  };
  return new Promise((resolve, reject) => {
    const f = fs.createWriteStream(outputFile, { encoding: "utf-8" });
    writeAssHead(f, width, height, fontface, fontsize, alpha, styleid);

    const maxTracks = Math.floor(height / fontsize);
    const scrollingTracks = {};
    const topTracks = {};
    const bottomTracks = {};

    comments.forEach((comment) => {
      const [timeline, pos, color] = comment.p.split(",").map(Number);
      const text = comment.m;

      const startTime = convertTimestamp(timeline);
      const endTime = convertTimestamp(timeline + duration);

      const gap = 1;
      const textWidth = text.length * fontsize * 0.6; // 粗略估算宽度
      const velocity = (width + textWidth) / duration;
      const leaveTime = textWidth / velocity + gap;

      const colorHex = `&H${(color & 0xffffff).toString(16).padStart(6, "0").toUpperCase()}`;
      let styles = "";

      let trackId;
      if (pos === 1) {
        // 滚动弹幕
        trackId = findNonOverlappingTrack(scrollingTracks, timeline, maxTracks);
        scrollingTracks[trackId] = timeline + leaveTime;
        const initialY = (trackId - 1) * fontsize + 10;
        styles = `\\move(${width}, ${initialY}, ${-textWidth}, ${initialY})`;
      } else if (pos === 4) {
        // 底部弹幕
        trackId = findNonOverlappingTrack(bottomTracks, timeline, maxTracks);
        bottomTracks[trackId] = timeline + duration;
        styles = `\\an2\\pos(${width / 2}, ${height - 50 - (trackId - 1) * fontsize})`;
      } else if (pos === 5) {
        // 顶部弹幕
        trackId = findNonOverlappingTrack(topTracks, timeline, maxTracks);
        topTracks[trackId] = timeline + duration;
        styles = `\\an8\\pos(${width / 2}, ${50 + (trackId - 1) * fontsize})`;
      } else {
        styles = `\\move(0, 0, ${width}, 0)`;
      }

      f.write(`Dialogue: 0,${startTime},${endTime},${styleid},,0,0,0,,{\\c${colorHex}${styles}}${text}\n`);
    });

    f.end((err) => {
      if (err) {
        reject(err); // 如果有错误，拒绝 Promise
      } else {
        console.log("弹幕生成结束");
        resolve(); // 完成时解析 Promise
      }
    });
  });
}

// 排序评论
function sortComments(commentData) {
  const comments = commentData.comments;
  return comments.sort((a, b) => {
    const timeA = parseFloat(a.p.split(",")[0]);
    const timeB = parseFloat(b.p.split(",")[0]);
    return timeA - timeB;
  });
}

// 生成弹幕 ASS 文件
async function generateDanmuAss(
  commentID,
  filePath,
  width = 1920,
  height = 1080,
  fontface = "Arial",
  fontsize = 50,
  alpha = 0.8,
  duration = 6,
) {
  const commentsData = await getComments(commentID);
  const comments = sortComments(commentsData);
  console.log(comments.length);
  const output = path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}.danmu.ass`);
  await convertCommentsToAss(comments, output, width, height, fontface, fontsize, alpha, duration);
  // 返回弹幕数量
  return comments.length;
}

// 合并字幕
async function combineSubAss(sub1, sub2) {
  if (!sub1 || !sub2) return false;

  const sub1Content = fs.readFileSync(sub1, "utf-8");
  const rawData = fs.readFileSync(sub2);
  const fileEncoding = chardet.detect(rawData);
  const sub2Content = fs.readFileSync(sub2, { encoding: fileEncoding });

  if (path.extname(sub2).toLowerCase() === ".ass") {
    console.log("开始合并字幕");
    const sub1ResX = sub1Content.match(/PlayResX:\s*(\d+)/);
    const sub2ResX = sub2Content.match(/PlayResX:\s*(\d+)/);
    let fontSizeRatio = 1;
    if (sub1ResX && sub2ResX) {
      fontSizeRatio = parseInt(sub1ResX[1]) / parseInt(sub2ResX[1]);
      console.log(`${sub1ResX[1]} and ${sub2ResX[1]}`);
    }

    const formatMatch = sub2Content.match(/Format:.+/);
    if (!formatMatch) return false;

    const formatLine = formatMatch[0];
    const styleLines = sub2Content.match(/Style:.+/g);
    const updatedStyleLines = styleLines
      .map((line) => {
        const elements = line.split(",");
        if (elements.length < 3) return line;
        elements[2] = Math.floor(parseFloat(elements[2]) * fontSizeRatio).toString();
        return elements.join(",");
      })
      .join("\n");

    const eventsStart = sub2Content.indexOf("[Events]");
    if (eventsStart === -1) {
      console.error("没找到 Events");
      return false;
    }

    const eventsContent = sub2Content.slice(eventsStart + "[Events]".length).trim();

    const output = path.join(path.dirname(sub2), `${path.basename(sub2, path.extname(sub2))}.withDanmu.ass`);
    fs.writeFileSync(
      output,
      `${sub1Content}\n[V4+ Styles]\n${formatLine}\n${updatedStyleLines}\n[Events]\n${eventsContent}`,
    );
    console.log("合并成功 - " + output);
    return true;
  } else {
    console.log("暂时不支持 srt");
    return false;
  }
}

// 查找字幕文件
function findSubtitleFile(filePath) {
  const filename = path.basename(filePath, path.extname(filePath));
  const dir = path.dirname(filePath);
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if ((file.endsWith(".srt") || file.endsWith(".ass")) && !file.includes("danmu") && file.startsWith(filename)) {
      const sub2 = path.join(dir, file);
      console.log("找到字幕文件 - " + sub2);
      return sub2;
    }
  }
  console.log("没找到字幕文件");
  return null;
}

// 获取视频流信息
function getVideoStreams(filePath) {
  const command = ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", filePath];

  try {
    const result = execFileSync(pathToFfprobe, command, { encoding: "utf-8" }); // 执行 ffprobe 命令
    return JSON.parse(result); // 解析并返回 JSON 结果
  } catch (error) {
    console.error(`获取视频流信息失败: ${error.message}`);
    return {};
  }
}

// 提取字幕流
function extractSubtitles(filePath, outputFile, streamIndex) {
  const command = ["-i", filePath, "-map", `0:${streamIndex}`, "-c:s", "ass", outputFile];

  try {
    execFileSync(pathToFfmpeg, command); // 执行 FFmpeg 命令
    return true; // 提取成功
  } catch (error) {
    console.error(`提取字幕失败: ${error.message}`);
    return false; // 提取失败
  }
}

// 尝试提取字幕
function tryExtractSub(filePath) {
  const streamsInfo = getVideoStreams(filePath);
  for (const stream of streamsInfo.streams) {
    if (stream.codec_type === "subtitle") {
      const streamIndex = stream.index;
      const baseName = path.basename(filePath, path.extname(filePath));
      const language = stream.tags.language || "unknown";
      if (!["zh", "zho", "chi", "chs", "cht", "cn"].includes(language)) continue;

      const outputFile = path.join(path.dirname(filePath), `${baseName}.${language}.ass`);
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
      }
      if (extractSubtitles(filePath, outputFile, streamIndex)) {
        console.log(`成功提取内嵌字幕 - ${filePath} -> ${outputFile}`);
      }
    }
  }
}

// 手动指定弹幕池生成弹幕
export const danmuGeneratorWithID = async (
  episodeID,
  filePath,
  width = 1920,
  height = 1080,
  fontface = "Arial",
  fontsize = 50,
  alpha = 0.8,
  duration = 10,
) => {
  var commentsCounts = await generateDanmuAss(episodeID, filePath, width, height, fontface, fontsize, alpha, duration);
  console.log(episodeID);
  const sub2 = findSubtitleFile(filePath);
  if (sub2 === null) {
    tryExtractSub(filePath);
    const newSub2 = findSubtitleFile(filePath);
    if (newSub2 !== null) {
      await combineSubAss(
        `${path.dirname(filePath)}/${path.basename(filePath, path.extname(filePath))}.danmu.ass`,
        newSub2,
      );
    }
  } else {
    await combineSubAss(`${path.dirname(filePath)}/${path.basename(filePath, path.extname(filePath))}.danmu.ass`, sub2);
  }
  return [true, commentsCounts];
};

// 手动匹配弹幕池
export const manualMatch = async (episodeID, filePath) => {
  const hash = await calculateMd5OfFirst16MB(filePath);

  const url = `https://api.dandanplay.net/api/v2/match/${episodeID}`;
  try {
    const response = await axios.post(
      url,
      {
        episodeId: episodeID,
        hash: hash,
        fileName: path.basename(filePath),
      },
      {
        headers: {
          Accept: "application/json",
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJBcHBJZCI6ImRkcGxheXdpbjMydjMiLCJVc2VySWQiOiIzMjk1NjkiLCJUb2tlbiI6IjEwNzc5ODA1NzAiLCJUaW1lc3RhbXAiOiIxNzIxNTY5MTgxIiwiZXhwIjoxNzIzMzgzNTgxLCJpc3MiOiJkYW5kYW5wbGF5Lm5ldCIsImF1ZCI6ImRhbmRhbnBsYXkubmV0In0.33pkIVc0MiHZ-_2Ml65DSSFvrcd1MXjxkM0_p6ya584",
        },
      },
    );
    console.log(response.data);
    if (response.data.success === true) {
      console.log("匹配成功");
      return [true, null];
    }
    return [false, response.data];
  } catch (error) {
    console.error(`匹配失败: ${error.message}`);
    return [false, null];
  }
};

/**
 * 主函数 - 生成弹幕
 *
 * @param {string} filePath - 要处理的视频文件的路径。
 * @param {number} [width=1920] - 生成弹幕的画面宽度，默认为 1920。
 * @param {number} [height=1080] - 生成弹幕的画面高度，默认为 1080。
 * @param {string} [fontface="Arial"] - 弹幕使用的字体，默认为 "Arial"。
 * @param {number} [fontsize=50] - 弹幕的字体大小，默认为 50。
 * @param {number} [alpha=0.8] - 弹幕的透明度，范围为 0 到 1，默认为 0.8。
 * @param {number} [duration=10] - 弹幕持续时间（以秒为单位），默认为 10 秒。
 *
 * @returns {Promise<[boolean, [string], [string], string]>}
 *          - 第一个元素是一个布尔值，表示弹幕生成是否成功。
 *          - 第二个元素是一个数组，包含可能的匹配标题。
 *          - 第三个元素是一个数组，包含可能的匹配 ID。
 *          - 第四个元素是匹配成功的话是生成弹幕的数量
 */
export const danmuGenerator = async (
  filePath,
  width = 1920,
  height = 1080,
  fontface = "Arial",
  fontsize = 50,
  alpha = 0.8,
  duration = 10,
) => {
  const commentID = await getCommentID(filePath);

  // 如果没匹配到，返回可能的匹配的标题以及ID
  if (commentID[0] === false) return [false, commentID[1][0], commentID[1][1], commentID[2]];
  // 如果匹配到，获取返回的ID，生成弹幕
  console.log("Get ID: " + commentID[2]);
  var commentsCounts = await generateDanmuAss(
    commentID[2],
    filePath,
    width,
    height,
    fontface,
    fontsize,
    alpha,
    duration,
  );

  const sub2 = findSubtitleFile(filePath);
  if (sub2 === null) {
    tryExtractSub(filePath);
    const newSub2 = findSubtitleFile(filePath);
    if (newSub2 !== null) {
      await combineSubAss(
        `${path.dirname(filePath)}/${path.basename(filePath, path.extname(filePath))}.danmu.ass`,
        newSub2,
      );
    }
  } else {
    await combineSubAss(`${path.dirname(filePath)}/${path.basename(filePath, path.extname(filePath))}.danmu.ass`, sub2);
  }
  return [true, [], [], commentsCounts];
};

export const manualSearch = async (filePath) => {
  const url = "https://api.dandanplay.net/api/v2/match";
  const hash = "0a63e53c2379a710fa239facb9437191";
  const name = path.basename(filePath);
  let info;

  try {
    const size = getFileSize(filePath);
    const duration = Math.floor(getVideoDuration(filePath));
    info = {
      fileName: name,
      fileHash: hash,
      fileSize: size,
      videoDuration: duration,
      matchMode: "hashAndFileName",
    };
  } catch (error) {
    console.error("获取文件信息失败");
    info = {
      fileName: name,
      fileHash: hash,
      fileSize: 0,
      videoDuration: 0,
      matchMode: "hashAndFileName",
    };
  }

  try {
    const response = await axios.post(url, info, {
      headers: {
        Accept: "application/json",
      },
    });
    if (response.status === 200) {
      const title = getTitleFromNfo(filePath);
      var titles = [];
      var ids = [];
      for (const match of response.data.matches) {
        const episodeTitle = match.episodeTitle.replace(/第\d+话 /, "");
        const animeTitle = match.animeTitle;
        console.log(`${episodeTitle} - ${match.episodeId}`);
        titles.push(animeTitle + ": " + episodeTitle);
        ids.push(match.episodeId);
      }

      return [true, [titles, ids], title];
    }
  } catch (error) {
    console.error(`获取弹幕ID失败: ${error.message}`);
    return [false, [null, null], null];
  }
};
