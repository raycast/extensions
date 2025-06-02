import { Clipboard, closeMainWindow, showToast, Toast, LocalStorage } from '@raycast/api';
import fetch from 'node-fetch';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { save, remove, getAllFavs } from './localEmotes';
import type { Emote } from '../types/emote';

const RECENT_KEY = 'recent-emotes';
const RECENT_LIMIT = 10;

export async function copyEmote(emote: Emote, recent: Emote[], setRecent: (emotes: Emote[]) => void): Promise<void> {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: 'Copying emote...',
      message: emote.name || 'Unknown Emote',
    });
    await closeMainWindow();
    const response = await fetch(emote.url);
    if (!response.ok) {
      throw new Error('Failed to fetch emote');
    }

    const buffer = await response.buffer();
    const tempDir = os.tmpdir();
    const fileName = `${emote.name}.${emote.url.endsWith('.gif') ? 'gif' : 'png'}`;
    const filePath = path.join(tempDir, fileName);

    await fs.promises.writeFile(filePath, buffer);
    await Clipboard.copy({ file: filePath });

    // Add to recent emotes
    const newRecent = [
      { ...emote, timestamp: Date.now() },
      ...recent.filter((e) => e.id !== emote.id || e.source !== emote.source),
    ].slice(0, RECENT_LIMIT);

    setRecent(newRecent);
    await LocalStorage.setItem(RECENT_KEY, JSON.stringify(newRecent));
    await save(emote, emote.source || 'bttv', 'recent');
    await showToast({
      style: Toast.Style.Success,
      title: `Pog! ${emote.name || 'Unknown Emote'} copied!`,
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "FeelsBadMan! Couldn't copy emote",
      message: 'Try again or pick another emote.',
    });
  }
}

export async function addToFavorites(emote: Emote, setFavorites: (emotes: Emote[]) => void): Promise<void> {
  try {
    await save(emote, emote.source || 'bttv', 'favs');
    await showToast({ style: Toast.Style.Success, title: 'Added emote to favorites' });
    const favs = await getAllFavs();
    setFavorites(favs);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Could not add emote to favorites',
    });
  }
}

export async function removeFromFavorites(emote: Emote, setFavorites: (emotes: Emote[]) => void): Promise<void> {
  try {
    await remove(emote, emote.source || 'bttv', 'favs');
    await showToast({ style: Toast.Style.Success, title: 'Removed emote from favorites' });
    const favs = await getAllFavs();
    setFavorites(favs);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Could not remove emote from favorites',
    });
  }
}

export async function removeFromRecents(
  emote: Emote,
  recent: Emote[],
  setRecent: (emotes: Emote[]) => void
): Promise<void> {
  try {
    await remove(emote, emote.source || 'bttv', 'recent');
    const newRecent = recent.filter((r) => r.id !== emote.id || r.source !== emote.source);
    setRecent(newRecent);
    await LocalStorage.setItem(RECENT_KEY, JSON.stringify(newRecent));
    await showToast({ style: Toast.Style.Success, title: 'Removed emote from recents' });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Could not remove emote from recents',
    });
  }
}
