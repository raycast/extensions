import { Clipboard, showHUD, Cache } from "@raycast/api";
import { filesize as fileSizeFormat } from "filesize";
import * as fs from "fs";
import * as path from "path";
import { Observable, observable } from "rct-state";
import { ActionType } from "../type/action";
import { FileType } from "../type/file";
import { LimitedMap } from "../utils/LimitedMap";
import {
  SectionList,
  executeFFmpegCommandAsync,
  fileInfoDataToMarkdown,
  generatePreviewImage,
  getFileInfoData,
} from "../utils/ffmpeg";
import { getFileType } from "../utils/ffmpeg/fileType";

const cache = new Cache();

enum CacheKey {
  displayPreviewImage = "displayPreviewImage",
}

interface State {
  filePaths: string[];
  selectedFilePath: string;
  log: string;
  fileInfo: SectionList;
  fileSize: number;
  fileType: FileType;
  hasVideoStream: boolean;
  hasAudioStream: boolean;
  /**
   * running ffmpeg
   */
  processing: boolean;
  process: number;
  error: string;
  latestAction: ActionType;
  displayPreviewImage: boolean;
  previewImage: Record<string, string>;
  loading: boolean;
  loadingDesc: string;
}

const defaultState: State = {
  filePaths: [],
  selectedFilePath: "",
  log: "",
  fileInfo: [],
  fileSize: 0,
  fileType: FileType.other,
  hasVideoStream: false,
  hasAudioStream: false,
  processing: false,
  process: 0,
  error: "",
  latestAction: ActionType.none,
  displayPreviewImage: cache.get(CacheKey.displayPreviewImage) === "0" ? false : true,
  previewImage: {},
  loading: false,
  loadingDesc: "",
};

function getTimeInSeconds(timeStr: string) {
  const [hours, minutes, seconds] = timeStr.split(":");
  return parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(seconds);
}

class FileManager {
  state$: Observable<State> = observable(defaultState);
  previewImageCache = new LimitedMap<string, string>(20);

  selectFile = async (filePath: string) => {
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats["size"];
    const { type: fileType, hasVideoStream, hasAudioStream } = getFileType(filePath);
    if (fileType === FileType.other) {
      this.state$.batch(() => {
        this.state$.fileSize.set(fileSizeInBytes);
        this.state$.fileInfo.set([]);
        this.state$.selectedFilePath.set(filePath);
        this.state$.fileType.set(fileType);
        this.state$.hasVideoStream.set(hasVideoStream);
        this.state$.hasAudioStream.set(hasAudioStream);
      });
      return;
    }

    try {
      const fileInfo = getFileInfoData(filePath);

      this.state$.batch(() => {
        this.state$.fileSize.set(fileSizeInBytes);
        this.state$.fileInfo.set(fileInfo);
        this.state$.selectedFilePath.set(filePath);
        this.state$.fileType.set(fileType);
        this.state$.hasVideoStream.set(hasVideoStream);
        this.state$.hasAudioStream.set(hasAudioStream);
      });
    } catch (e) {
      console.log("getFileInfoData error:", e);
    }

    if (this.state$.displayPreviewImage.get()) {
      try {
        setTimeout(() => {
          generatePreviewImage({ filePath }).then(({ filePath, previewImageFilePath }) => {
            if (filePath && previewImageFilePath) {
              this.previewImageCache.set(filePath, previewImageFilePath);
              this.state$.previewImage.set(Object.fromEntries(this.previewImageCache));
            }
          });
        }, 20);
      } catch (e) {
        console.log("generatePreviewImage error:", e);
      }
    }
  };

  getFileInfoMarkdown = () => {
    const filePath = this.state$.selectedFilePath.get();
    if (!filePath) {
      return "";
    }
    const fileInfo = [
      "# File Info\n\n",
      `- File Name: ${path.basename(filePath)}\n`,
      `- File Path: ${filePath}\n`,
      `- File Size: ${fileSizeFormat(this.state$.fileSize.get())}\n`,
      "\n\n------\n\n",
    ].join("");
    const videoInfo = fileInfoDataToMarkdown(this.state$.fileInfo.get());
    return fileInfo + videoInfo;
  };

  copy = {
    fileInfo: () => {
      Clipboard.copy(this.getFileInfoMarkdown());
      showHUD("File Info Copied!");
    },
    filePath: () => {
      const filePath = this.state$.selectedFilePath.get();
      if (filePath) {
        Clipboard.copy(filePath);
        showHUD("File Path Copied!");
      }
    },
  };

  private rotate = async (actionType: ActionType, rotate: "180" | "left" | "right") => {
    const filePath = this.state$.selectedFilePath.get();
    if (filePath) {
      let totalDuration = 0; // total video duration
      try {
        this.state$.batch(() => {
          this.state$.process.set(0);
          this.state$.processing.set(true);
          this.state$.latestAction?.set(actionType);
        });

        //const filename = path.basename(filePath);
        const baseNameNoExt = path.parse(filePath).name;
        const extName = path.extname(filePath);
        const basePath = path.dirname(filePath);
        let additionalIndex = 0;
        let targetFilePath = path.join(basePath, `${baseNameNoExt}_rotate_${rotate}${extName}`);
        while (fs.existsSync(targetFilePath)) {
          additionalIndex += 1;
          targetFilePath = path.join(basePath, `${baseNameNoExt}_rotate_${rotate}.${additionalIndex}${extName}`);
        }

        let rotateForFFmpeg = "PI";
        switch (rotate) {
          case "180":
            rotateForFFmpeg = "rotate=PI";
            break;
          case "left":
            rotateForFFmpeg = "transpose=0";
            break;
          case "right":
            rotateForFFmpeg = "transpose=1";
            break;
          default:
            break;
        }
        await executeFFmpegCommandAsync({
          command: `-i '${filePath}' -vf "${rotateForFFmpeg}" '${targetFilePath}'`,
          onContent: (data) => {
            console.log("onContent:", data);
            const match = data.match(/Duration: ([\d:.]+)/);
            if (match && match[1]) {
              totalDuration = getTimeInSeconds(match[1]);
            }

            // Extract current time
            const timeMatch = data.match(/time=([\d:.]+)/);
            if (timeMatch && timeMatch[1] && totalDuration) {
              const currentTime = getTimeInSeconds(timeMatch[1]);
              const percentage = (currentTime / totalDuration) * 100;
              const percentageRounded = Math.round(percentage * 100) / 100;
              this.state$.process.set(percentageRounded);
            }
          },
        });
        this.state$.process.set(100);
        showHUD("Rotate file finished!");
      } catch (e) {
        const error = (e as Error).toString();
        this.state$.error.set(error);
        showHUD("Rotate file error: " + error);
      } finally {
        this.state$.processing.set(false);
      }
    }
  };

  private makeVideoLoop = async (actionType: ActionType) => {
    console.log("Starting Making VideoLoop");
    const filePath = this.state$.selectedFilePath.get();
    console.log("Filepath is: ", filePath);

    if (filePath) {
      let totalDuration = 0; // total video duration
      try {
        this.state$.batch(() => {
          console.log("Setting states.");
          this.state$.process.set(0);
          console.log("processing set to true.");
          this.state$.processing.set(true);
          console.log("Now setting ActionType");
          this.state$.latestAction?.set(actionType);
        });

        console.log("Done setting states.");

        //const filename = path.basename(filePath);
        const baseNameNoExt = path.parse(filePath).name;
        console.log("Basename is: ", baseNameNoExt);

        //const extName = path.extname(filePath);
        const extName = ".mp4";
        const suffix = "_videoloop";
        const basePath = path.dirname(filePath);
        console.log("Base path is: ", basePath);

        let additionalIndex = 0;
        let targetFilePath = path.join(basePath, `${baseNameNoExt}${suffix}${extName}`);

        const scaleFilter = `"scale='trunc(ih*dar/2)*2:trunc(ih/2)*2',setsar=1/1,scale=w='if(lte(iw,ih),1080,-2)':h='if(lte(iw,ih),-2,1080)'"`;

        const ffmpegArguments = `-vcodec libx264 -preset veryslow -b:v 4000k -profile:v main -level:v 4.0 -pix_fmt yuv420p -vf "scale='trunc(ih*dar/2)*2:trunc(ih/2)*2',setsar=1/1,scale=w='if(lte(iw,ih),1080,-2)':h='if(lte(iw,ih),-2,1080)'" -bsf:v 'filter_units=remove_types=6' -fflags +bitexact -write_tmcd 0 -an -color_trc bt709 -movflags +faststart`;
        console.log("FFMPEG arguments are: ", ffmpegArguments);

        while (fs.existsSync(targetFilePath)) {
          console.log("File exists. Changing name with index.");
          additionalIndex += 1;
          targetFilePath = path.join(basePath, `${baseNameNoExt}${additionalIndex}${extName}`);
        }

        const fullFFMPEGCommand = `-i '${filePath}' ${ffmpegArguments} '${targetFilePath}'`;
        console.log("Full command: ", fullFFMPEGCommand);

        console.log("Starting FFMPEG process async after this:");
        await executeFFmpegCommandAsync({
          command: `${fullFFMPEGCommand}`,
          onContent: (data) => {
            console.log("onContent:", data);
            const match = data.match(/Duration: ([\d:.]+)/);
            if (match && match[1]) {
              totalDuration = getTimeInSeconds(match[1]);
            }

            // Extract current time
            const timeMatch = data.match(/time=([\d:.]+)/);
            if (timeMatch && timeMatch[1] && totalDuration) {
              const currentTime = getTimeInSeconds(timeMatch[1]);
              const percentage = (currentTime / totalDuration) * 100;
              const percentageRounded = Math.round(percentage * 100) / 100;
              this.state$.process.set(percentageRounded);
            }
          },
        });
        console.log("FFMPEG process is done.");
        this.state$.process.set(100);
        showHUD("Conversion file finished!");
      } catch (e) {
        const error = (e as Error).toString();
        this.state$.error.set(error);
        showHUD("Conversion file error: " + error);
      } finally {
        this.state$.processing.set(false);
      }
    }
  };

  convert = {
    videoloopmp4: async () => {
      this.makeVideoLoop(ActionType.convertVideoLoop);
    },
  };

  modify = {
    rotate: {
      _180: async () => this.rotate(ActionType.rotate180, "180"),
      left: async () => this.rotate(ActionType.rotate_90, "left"),
      right: async () => this.rotate(ActionType.rotate90, "right"),
    },
  };

  config = {
    previewImage: {
      show: () => {
        cache.set(CacheKey.displayPreviewImage, "1");
        this.state$.displayPreviewImage.set(true);
        this.selectFile(this.state$.selectedFilePath.get());
      },
      hide: () => {
        cache.set(CacheKey.displayPreviewImage, "0");
        this.state$.batch(() => {
          this.state$.displayPreviewImage.set(false);
          this.state$.previewImage.set({});
        });
      },
    },
  };
}

export const fileManager = new FileManager();
export const fileState$ = fileManager.state$;
