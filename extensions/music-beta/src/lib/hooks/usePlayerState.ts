import { useCachedPromise } from "@raycast/utils";
import { promisify } from "../utils";
import * as music from "@/lib/apple-music";

export default function usePlayerState(options?: { execute?: boolean }) {
	const {
		data: playerState,
		isLoading: isLoadingPlayerState,
		revalidate: revalidatePlayerState,
		mutate: mutatePlayerState,
	} = useCachedPromise(() => promisify(music.scripts.player.getPlayerState), [], options);

	return {
		playerState,
		isLoadingPlayerState,
		revalidatePlayerState,
		mutatePlayerState,
	};
}
