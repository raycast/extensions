import { Icon, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useCallback, useEffect, useMemo } from "react";
import { match } from "ts-pattern";

import * as music from "@/lib/apple-music/";

import { CurrentTrack } from "./lib/apple-music/scripts/current-track";
import { Preferences } from "./lib/preferences";
import { handleResult, promisify } from "./lib/utils";
import { PlayerState } from "./models/types";

function getTrack() {
	return promisify(music.scripts.currentTrack.getCurrentTrack());
}

function getPlayerState() {
	return promisify(music.scripts.player.getPlayerState);
}

function getTrackArtwork(track: CurrentTrack) {
	return music.trackToSong(track);
}

const MUSIC_ICON = "../assets/icon.png";

type Action = "next" | "prev" | "love" | "dislike";

function truncateTitleIfNeeded(title: string) {
	const max = Preferences.currentlyPlaying.maxTitleLength;
	if (max <= 5) return title;

	const truncated = title.slice(0, max);

	return `${truncated}${truncated.length < title.length ? "…" : ""}`;
}

function CurrentlyPlaying() {
	const {
		data: playerState = PlayerState.PAUSED,
		isLoading: isLoadingState,
		mutate: mutateState,
	} = useCachedPromise(getPlayerState);

	const {
		data: track,
		isLoading: isTrackLoading,
		error: trackError,
		mutate: mutateTrack,
	} = useCachedPromise(getTrack, [], {
		execute: playerState !== PlayerState.STOPPED,
	});

	const isStopped = playerState === PlayerState.STOPPED;
	const isPlaying = playerState === PlayerState.PLAYING;

	const {
		data: song,
		revalidate: revalidateSong,
		isLoading: isLoadingArtwork,
	} = useCachedPromise(getTrackArtwork, [track as any], {
		execute: !!track && !trackError && !isStopped && Preferences.experimental_music_api,
	});

	const [artwork, setArtwork] = useCachedState("artwork", MUSIC_ICON);
	const title = useMemo(() => {
		if (!track) return "Music";
		return truncateTitleIfNeeded(`${track.artist} - ${track.name}`);
	}, [track]);

	useEffect(() => {
		if (!track || !song || !Preferences.currentlyPlaying.displayArtowrk) {
			setArtwork(MUSIC_ICON);
			return;
		}

		setArtwork(song.attributes.artwork.url.replace("{w}", "150").replace("{h}", "150"));
	}, [track, song, Preferences.currentlyPlaying.displayArtowrk]);

	async function onToggle() {
		await mutateState(Promise.resolve(isPlaying ? PlayerState.PAUSED : PlayerState.PLAYING), {
			shouldRevalidateAfter: true,
		});

		await handleResult(music.scripts.player.playpause)();
	}

	const executeAction = useCallback(
		(actionType: Action) => {
			if (isStopped) return undefined;

			return async () => {
				const action = match(actionType)
					.with("next", () => music.scripts.player.next)
					.with("prev", () => music.scripts.player.previous)
					.with("love", () => music.scripts.currentTrack.love(!track?.loved))
					.with("dislike", () => music.scripts.currentTrack.dislike(!track?.disliked))
					.exhaustive();

				if (actionType === "next" || actionType === "prev") {
					revalidateSong();
				}

				await handleResult(action)();
				await mutateTrack(
					Promise.resolve({
						...track,
						loved: actionType === "love" ? !track?.loved : track?.loved,
						disliked: actionType === "dislike" ? !track?.disliked : track?.disliked,
					}),
					{
						rollbackOnError: true,
						shouldRevalidateAfter: true,
					}
				);
			};
		},
		[track, isStopped]
	);

	const showTrack = useCallback(async () => {
		await music.scripts.general.activate();

		if (isStopped) return;

		if (song) {
			const { url } = song.attributes;
			await open(url, "com.apple.Music");
			return;
		}

		await music.scripts.currentTrack.reveal();
	}, [isStopped, song]);

	return (
		<MenuBarExtra
			title={isStopped ? "Music" : (Preferences.currentlyPlaying.displayTitle && title) || undefined}
			icon={isStopped || !Preferences.experimental_music_api ? MUSIC_ICON : artwork}
			isLoading={isLoadingState || isTrackLoading || isLoadingArtwork}
		>
			<MenuBarExtra.Item
				icon={isPlaying ? Icon.Pause : Icon.Play}
				title={isPlaying ? "Pause" : "Play"}
				onAction={isStopped ? undefined : onToggle}
			/>
			<MenuBarExtra.Section>
				<MenuBarExtra.Item icon={Icon.Forward} title="Next Track" onAction={executeAction("next")} />
				<MenuBarExtra.Item icon={Icon.Rewind} title="Previous Track" onAction={executeAction("prev")} />
			</MenuBarExtra.Section>

			<MenuBarExtra.Section>
				<MenuBarExtra.Item
					icon={track?.loved ? Icon.Checkmark : Icon.Heart}
					title="Love"
					onAction={executeAction("love")}
				/>
				<MenuBarExtra.Item
					icon={track?.disliked ? Icon.Checkmark : Icon.HeartDisabled}
					title="Dislike"
					onAction={executeAction("dislike")}
				/>
			</MenuBarExtra.Section>
			<MenuBarExtra.Section>
				<MenuBarExtra.Item
					title={isStopped ? "Open Music" : "View in Music"}
					icon={MUSIC_ICON}
					onAction={showTrack}
				/>
			</MenuBarExtra.Section>
		</MenuBarExtra>
	);
}

export default CurrentlyPlaying;
