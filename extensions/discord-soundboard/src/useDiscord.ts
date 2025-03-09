import { useState, useEffect, useCallback, useRef } from "react";
import { showFailureToast, useCachedState } from "@raycast/utils";
import Discord, { type SoundboardItem, type DiscordGuild } from "./discord";
import { playSound, getCurrentVoiceChannelId } from "./discord-utils";
import { closeMainWindow } from "@raycast/api";

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 week

export type SoundboardItemWithGuild = SoundboardItem & { guildName: string };

export function useDiscord() {
  const isFirstMount = useRef(true);

  const [soundboardItems, setSoundboardItems] = useCachedState<SoundboardItemWithGuild[]>(
    "discord-soundboard-items",
    [],
  );
  const [guilds, setGuilds] = useCachedState<DiscordGuild[]>("discord-guilds", []);
  const [lastFetched, setLastFetched] = useCachedState<number>("discord-last-fetched", 0);

  // UI state
  const [isLoading, setIsLoading] = useState(false);

  const isCacheValid = useCallback(() => {
    const now = Date.now();
    return lastFetched > 0 && now - lastFetched < CACHE_DURATION;
  }, [lastFetched]);

  const fetchGuilds = useCallback(
    async (forceRefresh = false) => {
      if (!forceRefresh && isCacheValid()) return guilds;

      try {
        const fetchedGuilds = await Discord.getGuilds();
        setGuilds(fetchedGuilds);
        return fetchedGuilds;
      } catch (err) {
        throw new Error("Failed to fetch guilds from Discord");
      }
    },
    [setGuilds, guilds, isCacheValid],
  );

  const fetchSoundboardItems = useCallback(
    async (forceRefresh = false) => {
      if (!forceRefresh && isCacheValid()) {
        return;
      }

      setIsLoading(true);
      let tempItems = [...soundboardItems];

      try {
        const defaultSoundboardItems = await Discord.getDefaultSoundboardItems();
        const mappedDefault: SoundboardItemWithGuild[] = defaultSoundboardItems.map((item) => ({
          ...item,
          guildName: "Discord Sounds",
        }));

        const newDefaultItems = mappedDefault.filter((item) => !tempItems.some((tempItem) => tempItem.id === item.id));
        tempItems = [...tempItems, ...newDefaultItems];
        setSoundboardItems(tempItems);

        const guilds = await fetchGuilds(forceRefresh);
        const relevantGuilds = guilds.filter((guild) => guild.features.includes("SOUNDBOARD"));
        const relevantGuildNames = new Set(relevantGuilds.map((guild) => guild.name));

        for (const guild of relevantGuilds) {
          const soundboardItems = await Discord.getSoundboardItems(guild.id);
          if (!soundboardItems.length) continue;

          const mapped: SoundboardItemWithGuild[] = soundboardItems.map((item) => ({
            ...item,
            guildName: guild.name,
          }));

          tempItems = tempItems.filter(
            (tempItem) => tempItem.guildName !== guild.name || mapped.some((item) => item.id === tempItem.id),
          );

          const newItems = mapped.filter((item) => !tempItems.some((tempItem) => tempItem.id === item.id));
          tempItems = [...tempItems, ...newItems];
          setSoundboardItems(tempItems);
        }

        // Keep only items from relevant guilds
        tempItems = tempItems.filter(
          (item) => item.guildName === "Discord Sounds" || relevantGuildNames.has(item.guildName),
        );

        setSoundboardItems(tempItems);
        setLastFetched(Date.now());
      } catch (err) {
        console.error("Error fetching soundboard items:", err);
        await showFailureToast(err, {
          title: "Failed to fetch soundboard items",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [fetchGuilds, setSoundboardItems, setLastFetched, isCacheValid, soundboardItems],
  );

  useEffect(() => {
    if (isFirstMount.current) {
      fetchSoundboardItems();
      isFirstMount.current = false;
    }
  }, [fetchSoundboardItems]);

  return {
    soundboardItems,
    isLoading,
    refetch: () => fetchSoundboardItems(true),
    playSound: async (item: SoundboardItem) => {
      await playSound(item.id);
    },
    playSoundInCurrentChannel: async (item: SoundboardItem, close?: boolean) => {
      try {
        if (close) {
          await closeMainWindow();
          // TODO: If this closes, it will terminate the process. I need to offload the play to a separate process.
        }

        const currentVoiceChannelId = await getCurrentVoiceChannelId();
        if (!currentVoiceChannelId) {
          throw new Error("Not connected to a voice channel");
        }
        await Discord.sendSoundboardSound(item, currentVoiceChannelId);
        await playSound(item.id);
      } catch (err) {
        const title =
          close && typeof err === "object" && err !== null && "message" in err
            ? String(err?.message)
            : "Failed to play sound";
        await showFailureToast(err, {
          title,
        });
      }
    },
  };
}

export interface DiscordMethods {
  playSound: (item: SoundboardItem) => Promise<void>;
  playSoundInCurrentChannel: (item: SoundboardItem, close?: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}
