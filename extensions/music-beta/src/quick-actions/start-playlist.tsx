import Experimental_StartPlaylist from "@/components/experimental-views/start-playlist";
import StartPlaylist from "@/components/views/start-playlist";
import { Preferences } from "@/lib/preferences";

export default function StartPlaylistCmd() {
	if (Preferences.experimental_music_api) {
		return <Experimental_StartPlaylist />;
	}

	return <StartPlaylist />;
}
