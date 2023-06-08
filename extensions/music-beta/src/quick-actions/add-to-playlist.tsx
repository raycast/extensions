import Experiemntal_AddToPlaylist from "@/components/experimental-views/add-to-playlist";
import { Preferences } from "@/lib/preferences";
import LegacyAddToPlaylist from "@/components/views/add-to-playlist";

export default function AddToPlaylist() {
	if (Preferences.experimental_music_api) {
		return <Experiemntal_AddToPlaylist />;
	}

	return <LegacyAddToPlaylist />;
}
