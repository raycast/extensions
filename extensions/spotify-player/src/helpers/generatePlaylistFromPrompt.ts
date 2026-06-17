import { AI, Toast, showToast } from "@raycast/api";
import { cleanAIResponse } from "./cleanAIResponse";
import { resolveTracksOnSpotify } from "./resolveTracksOnSpotify";
import { Playlist } from "../generatePlaylist";

export async function generatePlaylistFromPrompt(userPrompt: string, history?: Playlist[]): Promise<Playlist> {
  const promptWithContext = history
    ? `Previous playlist: [${history?.map((playlist) => `"${playlist.prompt}"`).join(", ")}].
Modify with: "${userPrompt}"`
    : userPrompt;

  const playlistSample = {
    name: "Playlist Name",
    description: "A brief description of the playlist.",
    tracks: [
      { name: "Song Title 1", artists: ["Artist 1, Artist 2"] },
      { name: "Song Title 2", artists: ["Artist 1"] },
    ],
  };

  const prompt = `You are a Playlist generator.
Create a playlist of 10 songs based on user prompt: "${promptWithContext}".
Return ONLY minified JSON:
${JSON.stringify(playlistSample)}
Use exact Spotify song/artist names. No markdown, no explanation.`;

  const answer = AI.ask(prompt, { model: AI.Model["Perplexity_Sonar"] });

  await showToast({
    style: Toast.Style.Animated,
    title: history ? "Tuning playlist with AI..." : "Generating playlist with AI...",
  });

  const data = await answer;

  // Clean AI response
  const jsonString = cleanAIResponse(data);

  // Parse JSON string
  const playlist = JSON.parse(jsonString);

  playlist.prompt = userPrompt;
  const spotifyTracks = await resolveTracksOnSpotify(playlist.tracks);

  await showToast({
    style: Toast.Style.Success,
    title: history ? "Playlist tuned" : "Playlist generated",
    message: `"${playlist.name}" - ${spotifyTracks.filter(Boolean).length} songs`,
  });

  return {
    name: playlist.name,
    description: playlist.description,
    tracks: spotifyTracks,
    prompt: userPrompt,
  };
}
