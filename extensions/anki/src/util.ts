import { Color, List } from '@raycast/api';
import { DeckStats, DeckName, AddNoteParams, CreateCardFormValues, MediaFile } from './types';
import path from 'path';

export const getDeckState = (deck: DeckStats): List.Item.Accessory[] => {
  return [
    {
      text: {
        value: `New: ${deck.new_count}`,
        color: deck.new_count > 0 ? Color.Blue : Color.SecondaryText,
      },
    },
    {
      text: {
        value: `Learn: ${deck.learn_count}`,
        color: deck.learn_count > 0 ? Color.Red : Color.SecondaryText,
      },
    },
    {
      text: {
        value: `Due: ${deck.review_count}`,
        color: deck.review_count > 0 ? Color.Green : Color.SecondaryText,
      },
    },
  ];
};

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function combineDeckInfo(
  deckStats: { [key: string]: DeckStats },
  deckNames: DeckName
): DeckStats[] {
  const idToFullName = Object.fromEntries(
    Object.entries(deckNames).map(([fullName, id]) => [id.toString(), fullName])
  );

  return Object.values(deckStats).map(stat => ({
    ...stat,
    name: idToFullName[stat.deck_id.toString()] || stat.name,
  }));
}

// Helper functions to interpret card type and queue
export function getCardType(type: number): string {
  const types = ['New', 'Learning', 'Review', 'Relearning'];
  return types[type] || 'Unknown';
}

export function getQueueType(queue: number): string {
  const queues = ['New', 'Learning', 'Review', 'Day Learn', 'Preview', 'Suspended'];
  return queues[queue] || 'Unknown';
}

const SUPPORTED_FILE_TYPES = {
  image: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a', '.flac'],
  video: ['.mp4', '.webm', '.mov', '.avi', '.mkv'],
};

// TODO: add a cleaner re-write of this
export function transformSubmittedData(submittedData: CreateCardFormValues, modelFields: string[]) {
  const result: AddNoteParams = {
    deckName: submittedData.deckName,
    modelName: submittedData.modelName,
    fields: {},
    tags: submittedData.tags,
    audio: [],
    video: [],
    picture: [],
  };

  modelFields.forEach(fieldName => {
    result.fields[fieldName] = submittedData[`field_${fieldName}`] || '';
  });

  modelFields.forEach(fieldName => {
    const files = submittedData[`file_${fieldName}`] || [];
    files.forEach((file: string) => {
      const fileExtension = file.split('.').pop()?.toLowerCase();
      const fileName = file.split('/').pop();

      if (!fileExtension || !fileName) return;

      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(fileExtension)) {
        result.picture.push({
          path: `/${file}`,
          filename: fileName,
          fields: [fieldName],
        });
      } else if (['mp3', 'wav', 'ogg'].includes(fileExtension)) {
        result.audio.push({
          path: `/${file}`,
          filename: fileName,
          fields: [fieldName],
        });
      } else if (['mp4', 'webm', 'ogv'].includes(fileExtension)) {
        result.video.push({
          path: `/${file}`,
          filename: fileName,
          fields: [fieldName],
        });
      }
    });
  });

  return result;
}

function getMediaType(filename: string): 'image' | 'audio' | 'video' {
  const extension = filename.split('.').pop()?.toLowerCase();

  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
  const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];

  if (videoExtensions.includes(extension!)) return 'video';
  if (audioExtensions.includes(extension!)) return 'audio';
  return 'image';
}

export function parseMediaFiles(ankiFieldText: string): MediaFile[] {
  const mediaFiles: MediaFile[] = [];

  const imgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/g;
  const imgMatches = ankiFieldText.matchAll(imgRegex);
  for (const match of imgMatches) {
    mediaFiles.push({
      type: 'image',
      filename: match[1],
    });
  }

  const mediaRegex = /\[sound:(.*?)\]/g;
  const mediaMatches = ankiFieldText.matchAll(mediaRegex);
  for (const match of mediaMatches) {
    const filename = match[1];
    mediaFiles.push({
      type: getMediaType(filename),
      filename: filename,
    });
  }

  return mediaFiles;
}

export function isValidFileType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  return Object.values(SUPPORTED_FILE_TYPES).some(types => types.includes(extension));
}
