import fetch from 'node-fetch';
import {ImgflipCaptionImageResponse, ImgflipGetMemesResponse} from './types';
import {Meme} from 'types';
import {getLocalStorageItem, setLocalStorageItem} from '@raycast/api';

const IMGFLIP_USERNAME = 'raycast';
const IMGFLIP_PASSWORD = 'aha_qkt1wnh2QGJ-hrv';

interface Error {
  success: false;
  message: string;
}

interface GetMemesResult {
  success: true;
  memes: Meme[];
}

function cacheIsExpired(cacheTime: number): boolean {
  const day = 1000 * 60 * 60 * 24;
  return cacheTime < Date.now() - day;
}

async function getMemeResultsFromCache(): Promise<Meme[] | null> {
  const memeCacheTime = await getLocalStorageItem('meme-cache-time');
  const memeCache = await getLocalStorageItem('meme-cache');
  if (!memeCacheTime || !memeCache || cacheIsExpired(memeCacheTime as number)) {
    return null;
  }
  return JSON.parse(memeCache as string);
}

async function setMemeResultsCache(memes: Meme[]) {
  await setLocalStorageItem('meme-cache-time', Date.now());
  await setLocalStorageItem('meme-cache', JSON.stringify(memes));
}

export async function getMemes(): Promise<GetMemesResult | Error> {
  const memesFromCache = await getMemeResultsFromCache();
  if (memesFromCache) {
    return {success: true, memes: memesFromCache};
  }

  try {
    const response = await fetch('https://api.imgflip.com/get_memes');
    const data = (await response.json()) as ImgflipGetMemesResponse;

    if (data.success) {
      const memes = data.data.memes.map(
        ({id, name, url, box_count: boxCount}) => ({
          id,
          name,
          url,
          boxCount,
        }),
      );

      setMemeResultsCache(memes);
      return {
        success: true,
        memes,
      };
    } else {
      return {
        success: false,
        message: data.error_message,
      };
    }
  } catch {
    return {
      success: false,
      message: 'An unexpected network error occurred.',
    };
  }
}

interface GenerateMemeInput {
  id: string;
  font: 'impact' | 'arial';
  boxes: {text: string}[];
}

interface GenerateMemeResult {
  success: true;
  url: string;
}

export async function generateMeme({
  id,
  font,
  boxes,
}: GenerateMemeInput): Promise<GenerateMemeResult | Error> {
  try {
    const url = new URL('https://api.imgflip.com/caption_image');
    url.searchParams.set('template_id', id);
    url.searchParams.set('font', font);
    url.searchParams.set('boxes', JSON.stringify(boxes));
    url.searchParams.set('username', IMGFLIP_USERNAME);
    url.searchParams.set('password', IMGFLIP_PASSWORD);
    boxes.forEach(({text}, index) => {
      url.searchParams.set(`boxes[${index}][text]`, text);
    });

    const response = await fetch(url.toString(), {
      method: 'POST',
    });
    const data = (await response.json()) as ImgflipCaptionImageResponse;

    if (data.success) {
      return {
        success: true,
        url: data.data.url,
      };
    } else {
      return {
        success: false,
        message: data.error_message,
      };
    }
  } catch {
    return {
      success: false,
      message: 'An unexpected network error occurred.',
    };
  }
}
