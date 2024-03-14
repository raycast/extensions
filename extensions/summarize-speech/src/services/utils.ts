import path from "path";
import {TranscriptionCache, TranscriptionStatus, VoiceMemo} from "../interfaces";
import fs from "fs";
import {Icon} from "@raycast/api";

function getCacheFilePath(memoFilePath: string): string {
    const memoName = path.basename(memoFilePath, path.extname(memoFilePath)); // Strip extension
    return path.join(__dirname, 'cache', `${memoName}.txt`);
}

function readFromCache(cacheFilePath: string): TranscriptionCache | null {
    if (fs.existsSync(cacheFilePath)) {
        const data = fs.readFileSync(cacheFilePath, 'utf8');
        const cache = JSON.parse(data);
        // Set the status based on the cache data
        cache.status =
            cache.transcriptionResult === null
                ? TranscriptionStatus.REQUESTED
                : TranscriptionStatus.COMPLETE;
        return cache;
    }
    return null;
}

function saveToCache(cacheFilePath: string, data: TranscriptionCache): void {
    const dir = path.dirname(cacheFilePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {recursive: true});
    }
    if (!data.hasOwnProperty('isArchived')) {
        data.isArchived = false;
    }
    fs.writeFileSync(cacheFilePath, JSON.stringify(data), 'utf8');
}

function clearCache(memo?: VoiceMemo) {
  const cacheDir = path.join(__dirname, 'cache');
  const cacheFilePath = memo ? getCacheFilePath(memo.filePath) : null;

  if (cacheFilePath) {
    // Clear cache for the specific memo
    fs.unlink(cacheFilePath, (err) => {
      if (err) throw err;
      console.log(`Cache cleared successfully for memo: ${memo.title}`);
    });
  } else {
    // Clear entire cache
    fs.readdir(cacheDir, (err, files) => {
      if (err) throw err;

      files.forEach((file) => {
        fs.unlink(path.join(cacheDir, file), (err) => {
          if (err) throw err;
        });
      });
    });

    console.log('Cache cleared successfully.');
  }
}

function getTranscriptionStatusIcon(filePath: string): Icon {
    const cacheFilePath = getCacheFilePath(filePath);
    const cache = readFromCache(cacheFilePath);

    if (!cache || TranscriptionStatus.NOT_REQUESTED) {
        return Icon.Circle;
    }
    if (cache.isArchived) {
        return Icon.Box;
    }
    switch (cache.status) {
        case TranscriptionStatus.REQUESTED:
            return Icon.Clock;
        case TranscriptionStatus.COMPLETE:
            return Icon.Document;
        default:
            return Icon.Circle;
    }
}

function extractTimeFromFilePath(filePath: string): Date | null {
    const regex = /(\d{4})(\d{2})(\d{2}) (\d{2})(\d{2})(\d{2})/;
    const match = filePath.match(regex);

    if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1; // Months are 0-based in JavaScript
        const day = parseInt(match[3]);
        const hour = parseInt(match[4]);
        const minute = parseInt(match[5]);
        const second = parseInt(match[6]);

        return new Date(year, month, day, hour, minute, second);
    }

    return null;
}


function timeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) {
        return `${interval} years ago`;
    }
    if (interval === 1) {
        return '1 year ago';
    }
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
        return `${interval} months ago`;
    }
    if (interval === 1) {
        return '1 month ago';
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
        return `${interval} days ago`;
    }
    if (interval === 1) {
        return '1 day ago';
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
        return `${interval} hours ago`;
    }
    if (interval === 1) {
        return '1 hour ago';
    }
    interval = Math.floor(seconds / 60);
    if (interval > 1) {
        return `${interval} minutes ago`;
    }
    if (interval === 1) {
        return '1 minute ago';
    }
    return 'just now';
}


export {
    getCacheFilePath,
    readFromCache,
    saveToCache,
    clearCache,
    getTranscriptionStatusIcon,
    timeAgo,
    extractTimeFromFilePath,
};
