import Experimental_PlayLibraryTrack from "@/components/experimental-views/play-library-track";
import { Preferences } from "@/lib/preferences";
import LegacyPlayLibraryTrack from "@/components/views/play-library-track";

export default function PlayLibraryTrack() {
	if (Preferences.experimental_music_api) {
		return <Experimental_PlayLibraryTrack />;
	}

	return <LegacyPlayLibraryTrack />;
}
