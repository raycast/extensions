import { showToast, Toast } from "@raycast/api";
import { createClient } from "@supabase/supabase-js";
import { spawn } from "child_process";
import fetch from "node-fetch";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { savePlaybackState, clearPlaybackState } from "./shared-state";

interface MusicTrack {
  name: string;
  url: string;
  size: number;
  path: string;
}

export default async function Command() {
  try {
    // First stop any currently playing music
    spawn("pkill", ["-f", "afplay"]);

    showToast({
      style: Toast.Style.Animated,
      title: "🎵 Looma.FM",
      message: "Loading music library...",
    });

    // Supabase configuration (same as working reshuffle)
    const SUPABASE_URL = "https://fbrrpowisxjwnrsgvuek.supabase.co";
    const SUPABASE_ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZicnJwb3dpc3hqd25yc2d2dWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3ODAzNTMsImV4cCI6MjA2MDM1NjM1M30.JVTbW6u6BlDG0FGkU-8XrI6xXjvOosWrxxurJKcD7tI";

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get tracks from Supabase (exactly like reshuffle)
    const { data: files, error } = await supabase.storage
      .from("music_tracks")
      .list();

    if (error) throw error;

    if (files && files.length > 0) {
      showToast({
        style: Toast.Style.Animated,
        title: "📁 Found Files",
        message: `Processing ${files.length} files...`,
      });

      const musicFiles = files
        .filter((file) => {
          const isMusic = file.name.match(/\.(mp3|wav|m4a|aac|flac)$/i);
          const hasSize = (file.metadata?.size || 0) > 1000;
          return isMusic && hasSize;
        })
        .map((file): MusicTrack => {
          const { data } = supabase.storage
            .from("music_tracks")
            .getPublicUrl(file.name);

          return {
            name: file.name.replace(/\.[^/.]+$/, ""),
            url: data.publicUrl,
            size: file.metadata?.size || 0,
            path: file.name,
          };
        });

      if (musicFiles.length === 0) {
        throw new Error("No music files found");
      }

      showToast({
        style: Toast.Style.Animated,
        title: "🎵 Music Ready",
        message: `${musicFiles.length} tracks loaded, starting stream...`,
      });

      // Pick random track (exactly like reshuffle)
      const randomIndex = Math.floor(Math.random() * musicFiles.length);
      const track = musicFiles[randomIndex];

      showToast({
        style: Toast.Style.Animated,
        title: "🔄 Buffering...",
        message: `Loading ${track.name}`,
      });

      // Download and play the track (exactly like reshuffle)
      const response = await fetch(track.url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save to temp file (exactly like reshuffle)
      const tempFileName = `looma_${Date.now()}.mp3`;
      const tempFilePath = join(tmpdir(), tempFileName);
      writeFileSync(tempFilePath, new Uint8Array(buffer));

      // Play the audio file using macOS afplay (exactly like reshuffle)
      const audioProcess = spawn("afplay", [tempFilePath]);

      // Save current playback state for other commands including PID for targeted killing
      savePlaybackState({
        currentTrack: track,
        isPlaying: true,
        isPaused: false,
        tempFilePath,
        pid: audioProcess.pid,
      });

      audioProcess.on("close", (code) => {
        // Clean up temp file when done
        if (existsSync(tempFilePath)) {
          try {
            unlinkSync(tempFilePath);
          } catch (e) {
            console.log("Could not delete temp file:", e);
          }
        }

        // Clear playback state
        clearPlaybackState();

        if (code === 0) {
          // Track finished, offer to play another
          showToast({
            style: Toast.Style.Success,
            title: "🎵 Track Complete",
            message: `"${track.name}" finished • Use Reshuffle for next track`,
          });
        }
      });

      audioProcess.on("error", (err) => {
        console.error("Playback error:", err);
        showToast({
          style: Toast.Style.Failure,
          title: "Playback Error",
          message: `Cannot play ${track.name}`,
        });
        clearPlaybackState();
      });

      showToast({
        style: Toast.Style.Success,
        title: "♪ Now Streaming",
        message: `"${track.name}" • Looma.FM by Adi Goldstein`,
      });
    } else {
      throw new Error("No tracks found in music library");
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Looma.FM error:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Looma.FM Error",
      message: `Cannot start stream: ${errorMessage}`,
    });
  }
}
