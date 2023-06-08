import { Action, ActionPanel, Color, Icon, Image, List, Toast, confirmAlert, open, showToast } from "@raycast/api";

import addToLibrary from "@/quick-actions/add-to-library";
import AddToPlaylist from "@/quick-actions/add-to-playlist";
import StartPlaylist from "@/quick-actions/start-playlist";
import Recommendations from "@/quick-actions/recommendations";
import PlayLibraryTrack from "@/quick-actions/play-library-track";
import RecentlyPlayed from "@/quick-actions/recently-played";
import useAuth, { useAuthActions } from "@/lib/hooks/useAuth";
import { createDeeplink, handleResult } from "@/lib/utils";
import * as music from "@/lib/apple-music";
import { PlayerState } from "@/models/types";
import { P, match } from "ts-pattern";
import { askToEnableExperimentalApi } from "@/lib/hooks/useMustHaveApiEnabled";
import { debug } from "@/lib/logger";
import { useMemo } from "react";
import usePlayerState from "./lib/hooks/usePlayerState";
import useCurrentlyPlaying from "./lib/hooks/useCurrentlyPlaying";

// eslint-disable-next-line @typescript-eslint/ban-types
type DisabledReason = "auth-required" | "music-api-disabled" | (string & {});

interface BaseAction {
	id: string;

	title: string;
	description: string;
	icon: Image.ImageLike;

	disabled?: false | DisabledReason;

	requiredPlayerState?: PlayerState | PlayerState[];
}

interface QuickActionFn {
	onAction(): void;
}

interface QuickActionView {
	view: () => React.ReactNode;
}

type QuickAction = BaseAction & (QuickActionFn | QuickActionView);

const QuickAction = {
	isView: (action: QuickAction | QuickActionView): action is QuickActionView => {
		return (action as QuickActionView).view !== undefined;
	},
};

const icon = (icon: string): Image.ImageLike => ({
	tintColor: Color.PrimaryText,
	source: `icons/${icon}.svg`,
});

const createQuickLink = (action: QuickAction) => createDeeplink("quick-actions", { action: action.id });

export default function QuickActions() {
	const { isLoggedIn, isMusicApiEnabled, isLoading: isLoadingAuth } = useAuth(false);

	const { playerState, isLoadingPlayerState, revalidatePlayerState } = usePlayerState();

	const { isLoading: isLoadingCurrentlyPlaying, revalidateTrack, track: currentTrack } = useCurrentlyPlaying();

	const requiresAuth: DisabledReason | false = match({ isLoggedIn, isMusicApiEnabled })
		.with({ isMusicApiEnabled: false }, () => "music-api-disabled")
		.with({ isLoggedIn: false }, () => "auth-required")
		.otherwise(() => false);

	const quickActions: QuickAction[] = [
		{
			id: "play",
			title: "Play",
			icon: Icon.Play,
			description: "Play the current paused track",
			requiredPlayerState: PlayerState.PAUSED,
			onAction: handleResult(music.scripts.player.play, {
				errorMessage: "Failed to play",
				successText: "Played",
				onComplete: revalidatePlayerState,
			}),
		},
		{
			id: "pause",
			title: "Pause",
			icon: Icon.Pause,
			description: "Pause the current playing track",
			requiredPlayerState: PlayerState.PLAYING,
			onAction: handleResult(music.scripts.player.pause, {
				onComplete: revalidatePlayerState,
				successText: "Paused",
				errorMessage: "Failed to pause",
			}),
		},
		{
			id: "play-pause",
			title: "Play/Pause",
			icon: Icon.Play,
			description: "Play or pause the current track",
			requiredPlayerState: [PlayerState.PLAYING, PlayerState.PAUSED],
			onAction: handleResult(music.scripts.player.playpause, {
				onComplete: revalidatePlayerState,
				errorMessage: "Failed to play/pause",
				successText: match(playerState)
					.with(PlayerState.PLAYING, () => "Paused")
					.with(PlayerState.PAUSED, () => "Played")
					.otherwise(() => "Play/Pause"),
			}),
		},
		{
			id: "love-track",
			title: currentTrack?.loved ? "Unlove Track" : "Love track",
			icon: currentTrack?.loved ? Icon.HeartDisabled : Icon.Heart,
			requiredPlayerState: [PlayerState.PLAYING, PlayerState.PAUSED],
			description: "Love the current track",
			onAction: handleResult(music.scripts.currentTrack.love(!currentTrack?.loved), {
				errorMessage: "Failed to love track",
				successText: "Track loved",
				onComplete: revalidateTrack,
			}),
		},
		{
			id: "dislike-track",
			title: "Dislike",
			icon: icon("thumbs-down"),
			requiredPlayerState: [PlayerState.PLAYING, PlayerState.PAUSED],
			description: "Dislike the current track",
			onAction: handleResult(music.scripts.currentTrack.dislike(false), {
				errorMessage: "Failed to dislike track",
				successText: "Track disliked",
			}),
		},
		{
			id: "volume-up",
			title: "Volume Up",
			icon: icon("volume-max"),
			description: "Increase the volume",
			requiredPlayerState: [PlayerState.PLAYING, PlayerState.PAUSED],
			onAction: handleResult(music.scripts.player.volume.increase(), {
				errorMessage: "Failed to increase volume",
				successText: "Increased volume",
			}),
		},
		{
			id: "volume-down",
			title: "Volume Down",
			icon: icon("volume-min"),
			description: "Increase the volume",
			requiredPlayerState: [PlayerState.PLAYING, PlayerState.PAUSED],
			onAction: handleResult(music.scripts.player.volume.decrease(), {
				errorMessage: "Failed to increase volume",
				successText: "Increased volume",
			}),
		},
		{
			id: "toggle-shuffle",
			title: "Toggle Shuffle",
			description: "Toggle shuffle",
			requiredPlayerState: [PlayerState.PLAYING, PlayerState.PAUSED],
			icon: Icon.Shuffle,
			onAction: handleResult(music.scripts.player.shuffle.toggle, {
				errorMessage: "Failed to toggle shuffle",
				successText: "Toggled shuffle",
			}),
		},
		{
			id: "add-to-playlist",
			title: "Add to Playlist",
			icon: icon("add-to-playlist"),
			description: "Add the current track to a playlist",
			disabled: isMusicApiEnabled && requiresAuth,
			view: AddToPlaylist,
		},
		{
			id: "add-to-library",
			title: "Add to Library",
			icon: icon("add-to-library"),
			description: "Add the current track to your library",
			disabled: isMusicApiEnabled && requiresAuth,
			onAction: addToLibrary,
			requiredPlayerState: [PlayerState.PLAYING, PlayerState.PAUSED],
		},
		{
			id: "recommendations",
			title: "Recommendations",
			icon: icon("grid-01"),
			description: "Recommendations based on the current track",
			view: Recommendations,
			disabled: requiresAuth,
		},
		{
			id: "recently-played",
			title: "Recently Played",
			icon: icon("recently-played"),
			description: "Recently played tracks",
			view: RecentlyPlayed,
			disabled: requiresAuth,
		},
		{
			id: "start-playlist",
			title: "Start Playlist",
			icon: icon("start-playlist"),
			description: "Start a playlist",
			view: StartPlaylist,
			disabled: isMusicApiEnabled && requiresAuth,
		},
		{
			id: "play-library-track",
			title: "Play Library Track",
			icon: Icon.Music,
			description: "Play a track from your library",
			view: PlayLibraryTrack,
			disabled: isMusicApiEnabled && requiresAuth,
		},
		{
			id: "view-in-music",
			title: "View in Music",
			icon: icon("expand"),
			description: "View the current track in Music",
			requiredPlayerState: [PlayerState.PLAYING, PlayerState.PAUSED],
			onAction: handleResult(music.scripts.currentTrack.reveal, {
				errorMessage: "Failed to reveal track",
			}),
		},
	];

	return (
		<List
			isLoading={isLoadingPlayerState || isLoadingAuth || isLoadingCurrentlyPlaying}
			navigationTitle="Quick Actions"
		>
			<List.EmptyView title="Cannot find whay you're looking for" />
			{quickActions.map((action) => (
				<List.Item
					key={action.id}
					title={action.title}
					icon={action.icon}
					subtitle={action.description}
					actions={
						<ActionPanel>
							<PerformAction playerState={playerState ?? PlayerState.STOPPED} action={action} />

							<Action.CreateQuicklink
								title="Create Quicklink"
								quicklink={{
									link: createQuickLink(action),
									name: action.title,
								}}
							/>
						</ActionPanel>
					}
				/>
			))}
		</List>
	);
}

const PerformAction = ({ action, playerState }: { action: QuickAction; playerState: PlayerState }) => {
	const { askToLogin } = useAuthActions();

	const isPlayerOk = useMemo(() => {
		if (!action.requiredPlayerState) return true;

		if (Array.isArray(action.requiredPlayerState)) {
			return action.requiredPlayerState.includes(playerState);
		}

		return playerState === action.requiredPlayerState;
	}, [playerState, action.requiredPlayerState]);

	if (!isPlayerOk) {
		return (
			<Action
				{...action}
				onAction={() => {
					const message = match(playerState)
						.with(PlayerState.STOPPED, () => "The player is stopped")
						.with(PlayerState.PAUSED, () => "The player is paused")
						.with(PlayerState.PLAYING, () => "The player is playing")
						.exhaustive();

					showToast({
						title: "Cannot perform action",
						message,
						style: Toast.Style.Failure,
						primaryAction: {
							title: "Open Music",
							onAction: () => open("music://"),
						},
					});
				}}
			/>
		);
	}

	const warn = match(action.disabled)
		.with("auth-required", () => askToLogin)
		.with("music-api-disabled", () => askToEnableExperimentalApi)
		.with(
			P.string,
			(msg) => () =>
				confirmAlert({
					title: "Cannot perform action",
					message: msg,
					icon: Icon.Warning,
					primaryAction: {
						title: "Ok",
					},
				})
		)
		.otherwise(() => null);

	if (warn !== null) {
		return <Action {...action} onAction={warn} />;
	}

	if (QuickAction.isView(action)) {
		return (
			<Action.Push
				{...action}
				target={action.view() as any}
				onPush={() => debug("View pushed", action.id)}
			></Action.Push>
		);
	}

	return <Action {...action} onAction={action.onAction} />;
};
