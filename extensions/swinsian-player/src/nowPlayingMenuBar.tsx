import { MenuBarExtra, Icon, showHUD, Clipboard, launchCommand, LaunchType, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import path from "path";
import {
  getPlayerStatus,
  playpause,
  nextTrack,
  previousTrack,
  stop,
  reshuffle,
  setShuffle,
  setRepeatQueue,
  setRepeatSingle,
  setVolume,
  seek,
  toggleStopAfterTrack,
  activateApp,
  triggerSwinsianSearchAppleScript,
  loveOnLastFM,
  banOnLastFM,
  showMainWindow,
  showMiniWindow,
  showLibraryStatistics,
  showDeviceInspector,
  showEqualizer,
  getAudioOutputDevices,
  setAudioOutputDevice,
  rescanTags,
  resetPlayCount,
  setRating,
  addTrackToQueue,
  revealInFinder,
  revealArtistInFinder,
  copyAlbumPathToClipboard,
  copyLyrics,
  getFileMetadataReport,
  saveExternalReport,
  truncateText,
  getExtendedTrackMetadata,
  formatMetadataMarkdown,
  copyCoverArtFile,
  completeTags,
  fetchAlbumArt,
  addAlbumArt,
  clearAlbumArt,
  findAndReplace,
  findDuplicates,
  manageWindow,
} from "./helpers/swinsian";
import { getPreferenceValues } from "@raycast/api";
import { ToolboxDiscovery, ToolboxLastfm } from "./components/ToolboxMenu";
interface MenuBarPreferences {
  hideIconWhenIdle: boolean;
  hideArtistName: boolean;
  maxTextLength: string;
  showControlsSection: boolean;
  showModesSection: boolean;
  showVolumeSection: boolean;
  showDiscoverySection: boolean;
  showCopySection: boolean;
  showLastfmSection: boolean;
  showOutputSection: boolean;
  showWindowsSection: boolean;
  showLibrarySection: boolean;
  showOpenCommandsSection: boolean;
  toolboxHiddenCategories: string;
  toolboxHiddenServices: string;
  toolboxCustomServices: string;
  toolboxLastfmUsername: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function setRepeat(mode: "off" | "single" | "queue"): Promise<void> {
  if (mode === "off") {
    await setRepeatSingle(false);
    await setRepeatQueue(false);
    return;
  }

  if (mode === "single") {
    await setRepeatQueue(true);
    await setRepeatSingle(true);
    return;
  }

  await setRepeatSingle(false);
  await setRepeatQueue(true);
}

export default function NowPlayingMenuBar() {
  const prefs = getPreferenceValues<MenuBarPreferences>();
  const {
    data: status,
    revalidate: revalidateStatus,
    isLoading,
  } = useCachedPromise(getPlayerStatus, [], {
    keepPreviousData: true,
  });

  const track = status?.track;
  const isPlaying = status?.state === "playing";
  const { data: audioDevices = [], revalidate: revalidateAudioDevices } = useCachedPromise(async () => {
    try {
      return await getAudioOutputDevices();
    } catch {
      return [];
    }
  });
  const showToolkitSection =
    prefs.showDiscoverySection ||
    prefs.showCopySection ||
    prefs.showLibrarySection ||
    prefs.showWindowsSection ||
    prefs.showOpenCommandsSection;
  const raycastSubmenu = (
    <MenuBarExtra.Submenu title="Raycast" icon={{ source: "raycast-white.png" }}>
      <MenuBarExtra.Item
        title="Browse Library"
        icon={Icon.Book}
        onAction={() => launchCommand({ name: "libraryBrowser", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Item
        title="Quick Search"
        icon={Icon.MagnifyingGlass}
        onAction={() => launchCommand({ name: "search", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Item
        title="Browse Playlists"
        icon={Icon.List}
        onAction={() => launchCommand({ name: "playlists", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Item
        title="Add Track to Playlist"
        icon={Icon.Plus}
        onAction={() => launchCommand({ name: "addToPlaylist", type: LaunchType.UserInitiated })}
      />
    </MenuBarExtra.Submenu>
  );
  const menuBarTitle = track
    ? truncateText(
        prefs.hideArtistName ? track.name : `${track.name} – ${track.artist}`,
        parseInt(prefs.maxTextLength || "30"),
      )
    : undefined;

  if (prefs.hideIconWhenIdle && !track) {
    return null;
  }

  return (
    <MenuBarExtra icon={{ source: "swinsian-white.svg" }} title={menuBarTitle} isLoading={isLoading}>
      <MenuBarExtra.Item
        title="Search Library..."
        icon={Icon.MagnifyingGlass}
        onAction={triggerSwinsianSearchAppleScript}
      />

      {track ? (
        <>
          <MenuBarExtra.Section title="Now Playing">
            <MenuBarExtra.Item title={track.name} icon={Icon.Music} onAction={activateApp} />
            <MenuBarExtra.Item
              title={track.artist}
              icon={Icon.Person}
              onAction={async () => {
                await revealArtistInFinder(track.path);
              }}
            />
            <MenuBarExtra.Item
              title={`${track.album} - ${track.year > 0 ? track.year : "Unknown Year"}`}
              icon={Icon.Cd}
              onAction={async () => {
                await copyAlbumPathToClipboard(track.path);
              }}
            />
            <MenuBarExtra.Item title={track.genre || "Unknown Genre"} icon={Icon.Tag} onAction={activateApp} />
            {prefs.showLastfmSection && (
              <MenuBarExtra.Item
                title="Love on Last.fm"
                icon={Icon.Heart}
                onAction={async () => {
                  try {
                    await loveOnLastFM();
                    await showHUD("Loved on Last.fm");
                  } catch (error) {
                    await showHUD(`Couldn't love track: ${errorMessage(error)}`);
                  }
                }}
                shortcut={{ modifiers: ["ctrl", "shift"], key: "l" }}
              />
            )}
          </MenuBarExtra.Section>

          {(prefs.showControlsSection || prefs.showLibrarySection || prefs.showWindowsSection) && (
            <MenuBarExtra.Section title="Controls">
              {prefs.showControlsSection && (
                <MenuBarExtra.Submenu title="Playback" icon={Icon.Play}>
                  <MenuBarExtra.Section title="Transport">
                    <MenuBarExtra.Item
                      title={isPlaying ? "Pause" : "Play"}
                      icon={isPlaying ? Icon.Pause : Icon.Play}
                      onAction={async () => {
                        await playpause();
                        await revalidateStatus();
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "space" }}
                    />
                    <MenuBarExtra.Item
                      title="Next"
                      icon={Icon.Forward}
                      onAction={async () => {
                        await nextTrack();
                        await revalidateStatus();
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                    />
                    <MenuBarExtra.Item
                      title="Previous"
                      icon={Icon.RewindFilled}
                      onAction={async () => {
                        await previousTrack();
                        await revalidateStatus();
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                    />
                    <MenuBarExtra.Item
                      title="Stop"
                      icon={Icon.Stop}
                      onAction={async () => {
                        await stop();
                        await revalidateStatus();
                      }}
                    />
                  </MenuBarExtra.Section>

                  <MenuBarExtra.Section title="Track">
                    <MenuBarExtra.Item
                      title="Add to Playlist"
                      icon={Icon.Plus}
                      onAction={() => launchCommand({ name: "addToPlaylist", type: LaunchType.UserInitiated })}
                    />
                    <MenuBarExtra.Item
                      title="Add to Queue"
                      icon={Icon.Plus}
                      onAction={async () => {
                        try {
                          await addTrackToQueue(track.path, track.id);
                          await showHUD("Added current track to queue");
                        } catch (error) {
                          await showHUD(`Couldn't add track to queue: ${errorMessage(error)}`);
                        }
                      }}
                    />
                    {prefs.showModesSection && (
                      <MenuBarExtra.Submenu
                        title={`Rating: ${"★".repeat(Math.round(track.rating))}${"☆".repeat(5 - Math.round(track.rating))}`}
                        icon={Icon.Star}
                      >
                        {[1, 2, 3, 4, 5].map((s) => (
                          <MenuBarExtra.Item
                            key={s}
                            title={`${"★".repeat(s)}${"☆".repeat(5 - s)}`}
                            onAction={async () => {
                              await setRating(s);
                              await showHUD(`Rated ${s} star${s > 1 ? "s" : ""}`);
                              await revalidateStatus();
                            }}
                          />
                        ))}
                        <MenuBarExtra.Item
                          title="Clear Rating"
                          icon={Icon.XMarkCircle}
                          onAction={async () => {
                            await setRating(0);
                            await showHUD("Rating cleared");
                            await revalidateStatus();
                          }}
                        />
                      </MenuBarExtra.Submenu>
                    )}
                    {prefs.showLastfmSection && (
                      <MenuBarExtra.Item
                        title="Ban on Last.fm"
                        icon={Icon.XMarkCircle}
                        onAction={async () => {
                          try {
                            await banOnLastFM();
                            await showHUD("Banned on Last.fm");
                          } catch (error) {
                            await showHUD(`Couldn't ban track: ${errorMessage(error)}`);
                          }
                        }}
                      />
                    )}
                  </MenuBarExtra.Section>

                  <MenuBarExtra.Section title="Seek">
                    <MenuBarExtra.Item
                      title="Step Backward"
                      icon={Icon.Rewind}
                      onAction={async () => {
                        await seek(-15);
                      }}
                      shortcut={{ modifiers: ["opt", "cmd"], key: "arrowLeft" }}
                    />
                    <MenuBarExtra.Item
                      title="Step Forward"
                      icon={Icon.Forward}
                      onAction={async () => {
                        await seek(15);
                      }}
                      shortcut={{ modifiers: ["opt", "cmd"], key: "arrowRight" }}
                    />
                  </MenuBarExtra.Section>

                  {prefs.showVolumeSection && (
                    <MenuBarExtra.Section title="Volume">
                      <MenuBarExtra.Item
                        title="Increase Volume"
                        icon={Icon.SpeakerHigh}
                        onAction={async () => {
                          await setVolume(status.volume + 10);
                          await revalidateStatus();
                        }}
                      />
                      <MenuBarExtra.Item
                        title="Decrease Volume"
                        icon={Icon.SpeakerLow}
                        onAction={async () => {
                          await setVolume(status.volume - 10);
                          await revalidateStatus();
                        }}
                      />
                    </MenuBarExtra.Section>
                  )}
                  {prefs.showModesSection && (
                    <MenuBarExtra.Section title="Modes">
                      <MenuBarExtra.Submenu
                        title={`Repeat: ${status.repeatSingle ? "Single" : status.repeatQueue ? "Queue" : "Off"}`}
                        icon={Icon.Repeat}
                      >
                        <MenuBarExtra.Item
                          title="Off"
                          icon={!status.repeatQueue && !status.repeatSingle ? Icon.Check : undefined}
                          onAction={async () => {
                            await setRepeat("off");
                            await revalidateStatus();
                          }}
                        />
                        <MenuBarExtra.Item
                          title="Single"
                          icon={status.repeatSingle ? Icon.Check : undefined}
                          onAction={async () => {
                            await setRepeat("single");
                            await revalidateStatus();
                          }}
                        />
                        <MenuBarExtra.Item
                          title="Queue"
                          icon={status.repeatQueue && !status.repeatSingle ? Icon.Check : undefined}
                          onAction={async () => {
                            await setRepeat("queue");
                            await revalidateStatus();
                          }}
                        />
                      </MenuBarExtra.Submenu>

                      <MenuBarExtra.Submenu
                        title={`Shuffle: ${status.shuffle !== "none" ? (status.shuffle === "track shuffle" ? "Track" : "Album") : "Off"}`}
                        icon={Icon.Shuffle}
                      >
                        <MenuBarExtra.Item
                          title="Off"
                          icon={status.shuffle === "none" ? Icon.Check : undefined}
                          onAction={async () => {
                            await setShuffle("none");
                            await revalidateStatus();
                          }}
                        />
                        <MenuBarExtra.Item
                          title="Track Shuffle"
                          icon={status.shuffle === "track shuffle" ? Icon.Check : undefined}
                          onAction={async () => {
                            await setShuffle("track shuffle");
                            await revalidateStatus();
                          }}
                        />
                        <MenuBarExtra.Item
                          title="Album Shuffle"
                          icon={status.shuffle === "album shuffle" ? Icon.Check : undefined}
                          onAction={async () => {
                            await setShuffle("album shuffle");
                            await revalidateStatus();
                          }}
                        />
                      </MenuBarExtra.Submenu>

                      <MenuBarExtra.Submenu
                        title={`Stop After Track: ${status.stopAfterTrack ? "On" : "Off"}`}
                        icon={Icon.Stop}
                      >
                        <MenuBarExtra.Item
                          title="On"
                          icon={status.stopAfterTrack ? Icon.Check : undefined}
                          onAction={async () => {
                            if (!status.stopAfterTrack) await toggleStopAfterTrack();
                            await revalidateStatus();
                          }}
                        />
                        <MenuBarExtra.Item
                          title="Off"
                          icon={!status.stopAfterTrack ? Icon.Check : undefined}
                          onAction={async () => {
                            if (status.stopAfterTrack) await toggleStopAfterTrack();
                            await revalidateStatus();
                          }}
                        />
                      </MenuBarExtra.Submenu>
                      <MenuBarExtra.Item
                        title="Reshuffle"
                        icon={Icon.Shuffle}
                        onAction={async () => {
                          await reshuffle();
                          await revalidateStatus();
                        }}
                      />
                    </MenuBarExtra.Section>
                  )}
                </MenuBarExtra.Submenu>
              )}

              {prefs.showLibrarySection && (
                <MenuBarExtra.Submenu title="Library" icon={Icon.Book}>
                  <MenuBarExtra.Section title="Tags">
                    <MenuBarExtra.Item
                      title="Rescan Tags"
                      icon={Icon.Hammer}
                      onAction={async () => {
                        await showHUD("Rescanning tags...");
                        try {
                          await rescanTags();
                          await showHUD("✓ Tags rescanned");
                        } catch (error) {
                          await showHUD(`Error: ${errorMessage(error)}`);
                        }
                      }}
                    />
                    <MenuBarExtra.Item
                      title="Complete Tags..."
                      icon={Icon.Pencil}
                      onAction={async () => {
                        await showHUD("Opening Complete Tags...");
                        try {
                          await completeTags();
                        } catch (error) {
                          await showHUD(`Error: ${errorMessage(error)}`);
                        }
                      }}
                    />
                    <MenuBarExtra.Item
                      title="Reset Play Count"
                      icon={Icon.RotateAntiClockwise}
                      onAction={async () => {
                        await resetPlayCount();
                        await showHUD("Play count reset");
                      }}
                    />
                  </MenuBarExtra.Section>

                  <MenuBarExtra.Section title="Album Art">
                    <MenuBarExtra.Item
                      title="Fetch Album Art"
                      icon={Icon.Image}
                      onAction={async () => {
                        await showHUD("Fetching album art...");
                        try {
                          await fetchAlbumArt();
                        } catch (error) {
                          await showHUD(`Error: ${errorMessage(error)}`);
                        }
                      }}
                    />
                    <MenuBarExtra.Item
                      title="Add Album Art..."
                      icon={Icon.Plus}
                      onAction={async () => {
                        await showHUD("Opening Add Album Art...");
                        try {
                          await addAlbumArt();
                        } catch (error) {
                          await showHUD(`Error: ${errorMessage(error)}`);
                        }
                      }}
                    />
                    <MenuBarExtra.Item
                      title="Clear Album Art..."
                      icon={Icon.XMarkCircle}
                      onAction={async () => {
                        await showHUD("Clearing album art...");
                        try {
                          await clearAlbumArt();
                        } catch (error) {
                          await showHUD(`Error: ${errorMessage(error)}`);
                        }
                      }}
                    />
                  </MenuBarExtra.Section>

                  <MenuBarExtra.Section title="Find">
                    <MenuBarExtra.Item
                      title="Find and Replace..."
                      icon={Icon.MagnifyingGlass}
                      onAction={async () => {
                        await showHUD("Opening Find and Replace...");
                        try {
                          await findAndReplace();
                        } catch (error) {
                          await showHUD(`Error: ${errorMessage(error)}`);
                        }
                      }}
                    />
                    <MenuBarExtra.Item
                      title="Find Duplicates..."
                      icon={Icon.TwoPeople}
                      onAction={async () => {
                        await showHUD("Finding duplicates...");
                        try {
                          await findDuplicates();
                        } catch (error) {
                          await showHUD(`Error: ${errorMessage(error)}`);
                        }
                      }}
                    />
                  </MenuBarExtra.Section>
                </MenuBarExtra.Submenu>
              )}

              {prefs.showWindowsSection && (
                <MenuBarExtra.Submenu title="Options" icon={Icon.Gear}>
                  <MenuBarExtra.Section title="Windows">
                    <MenuBarExtra.Item
                      title="Main Window"
                      icon={Icon.AppWindow}
                      onAction={showMainWindow}
                      shortcut={{ modifiers: ["cmd"], key: "1" }}
                    />
                    <MenuBarExtra.Item
                      title="Mini Player"
                      icon={Icon.AppWindowList}
                      onAction={showMiniWindow}
                      shortcut={{ modifiers: ["cmd"], key: "2" }}
                    />
                    <MenuBarExtra.Item
                      title="Quick Controller"
                      icon={Icon.ArrowsExpand}
                      onAction={() => manageWindow("quick")}
                    />
                  </MenuBarExtra.Section>
                  <MenuBarExtra.Section title="Utilities">
                    <MenuBarExtra.Item
                      title="Equalizer"
                      icon={Icon.Layers}
                      onAction={showEqualizer}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                    />
                    <MenuBarExtra.Submenu
                      title={`Output Device${audioDevices.find((device) => device.active)?.name ? `: ${audioDevices.find((device) => device.active)?.name}` : ""}`}
                      icon={Icon.SpeakerHigh}
                    >
                      {audioDevices.length > 0 ? (
                        audioDevices.map((device) => (
                          <MenuBarExtra.Item
                            key={device.id}
                            title={device.name}
                            icon={device.active ? Icon.Check : Icon.Speaker}
                            onAction={async () => {
                              try {
                                await setAudioOutputDevice(device.id);
                                await revalidateAudioDevices();
                                await showHUD(`Output device: ${device.name}`);
                              } catch (error) {
                                await showHUD(`Couldn't change output device: ${errorMessage(error)}`);
                              }
                            }}
                          />
                        ))
                      ) : (
                        <MenuBarExtra.Item title="No Output Devices Found" icon={Icon.SpeakerOff} />
                      )}
                    </MenuBarExtra.Submenu>
                    <MenuBarExtra.Item
                      title="Library Statistics"
                      icon={Icon.BarChart}
                      onAction={showLibraryStatistics}
                    />
                    {prefs.showOutputSection && (
                      <MenuBarExtra.Item title="Device Inspector" icon={Icon.Info} onAction={showDeviceInspector} />
                    )}
                  </MenuBarExtra.Section>
                </MenuBarExtra.Submenu>
              )}
            </MenuBarExtra.Section>
          )}

          {showToolkitSection && (
            <MenuBarExtra.Section title="Actions">
              {prefs.showDiscoverySection && (
                <ToolboxDiscovery
                  track={track}
                  hiddenCategories={prefs.toolboxHiddenCategories || ""}
                  hiddenServices={prefs.toolboxHiddenServices || ""}
                  customServices={prefs.toolboxCustomServices || ""}
                  lastfmUsername={prefs.toolboxLastfmUsername || ""}
                />
              )}
              {prefs.showCopySection && (
                <MenuBarExtra.Submenu title="Tools" icon={Icon.Hammer}>
                  <MenuBarExtra.Section title="Text">
                    <MenuBarExtra.Item
                      title="Artist – Track"
                      icon={Icon.Music}
                      onAction={async () => {
                        await Clipboard.copy(`${track.artist} – ${track.name}`);
                        await showHUD("Copied artist and track");
                      }}
                    />
                    <MenuBarExtra.Item
                      title="Artist – Album – Track"
                      icon={Icon.Cd}
                      onAction={async () => {
                        await Clipboard.copy(`${track.artist} – ${track.album} – ${track.name}`);
                        await showHUD("Copied artist, album, and track");
                      }}
                    />
                    <MenuBarExtra.Item
                      title="Lyrics"
                      icon={Icon.TextDocument}
                      onAction={async () => {
                        const result = await copyLyrics();
                        await showHUD(result);
                      }}
                    />
                  </MenuBarExtra.Section>

                  <MenuBarExtra.Section title="Metadata">
                    <MenuBarExtra.Item
                      title="Metadata as JSON"
                      icon={Icon.Code}
                      onAction={async () => {
                        try {
                          const m = await getExtendedTrackMetadata();
                          if (m) {
                            await Clipboard.copy(JSON.stringify(m, null, 2));
                            await showHUD("Copied as JSON");
                          }
                        } catch (error) {
                          await showHUD(`Couldn't copy track metadata: ${errorMessage(error)}`);
                        }
                      }}
                    />
                    <MenuBarExtra.Item
                      title="Metadata as Markdown"
                      icon={Icon.TextDocument}
                      onAction={async () => {
                        try {
                          const m = await getExtendedTrackMetadata();
                          if (m) {
                            const md = formatMetadataMarkdown(m);
                            await Clipboard.copy(md);
                            await showHUD("Copied as Markdown");
                          }
                        } catch (error) {
                          await showHUD(`Couldn't copy track metadata: ${errorMessage(error)}`);
                        }
                      }}
                    />
                  </MenuBarExtra.Section>

                  <MenuBarExtra.Section title="Artwork">
                    <MenuBarExtra.Item
                      title="Cover Art"
                      icon={Icon.Image}
                      onAction={async () => {
                        const result = await copyCoverArtFile();
                        await showHUD(result);
                      }}
                    />
                  </MenuBarExtra.Section>

                  <MenuBarExtra.Section title="Paths">
                    <MenuBarExtra.Item
                      title="Artist Folder"
                      icon={Icon.Folder}
                      onAction={async () => {
                        const artistPath = path.dirname(path.dirname(track.path));
                        await Clipboard.copy(artistPath);
                        await showHUD("Copied artist path");
                      }}
                    />
                    <MenuBarExtra.Item
                      title="Album Folder"
                      icon={Icon.Folder}
                      onAction={async () => {
                        const albumPath = path.dirname(track.path);
                        await Clipboard.copy(albumPath);
                        await showHUD("Copied album path");
                      }}
                    />
                    <MenuBarExtra.Item
                      title="Track File"
                      icon={Icon.Document}
                      onAction={async () => {
                        await Clipboard.copy(track.path);
                        await showHUD("Copied track path");
                      }}
                    />
                  </MenuBarExtra.Section>
                  <MenuBarExtra.Section title="Finder">
                    <MenuBarExtra.Item
                      title="Reveal Track in Finder"
                      icon={Icon.Finder}
                      onAction={async () => {
                        await revealInFinder(track.path);
                      }}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                    />
                  </MenuBarExtra.Section>
                  <ToolboxLastfm
                    track={track}
                    hiddenCategories={prefs.toolboxHiddenCategories || ""}
                    hiddenServices={prefs.toolboxHiddenServices || ""}
                    customServices={prefs.toolboxCustomServices || ""}
                    lastfmUsername={prefs.toolboxLastfmUsername || ""}
                  />
                  <MenuBarExtra.Section title="Reports">
                    <MenuBarExtra.Item
                      title="File Metadata"
                      icon={Icon.Info}
                      onAction={async () => {
                        await showHUD("Reading file metadata...");
                        try {
                          const report = await getFileMetadataReport();
                          await Clipboard.copy(report.body);
                          await showHUD("Copied file metadata report");
                        } catch (error) {
                          await showHUD(`Couldn't build report: ${errorMessage(error)}`);
                        }
                      }}
                    />
                    <MenuBarExtra.Item
                      title="Save File Metadata…"
                      icon={Icon.Document}
                      onAction={async () => {
                        try {
                          const savedPath = await saveExternalReport(await getFileMetadataReport());
                          if (savedPath) await showHUD("Saved file metadata report");
                        } catch (error) {
                          await showHUD(`Couldn't save report: ${errorMessage(error)}`);
                        }
                      }}
                    />
                  </MenuBarExtra.Section>
                </MenuBarExtra.Submenu>
              )}
              {prefs.showOpenCommandsSection && raycastSubmenu}
            </MenuBarExtra.Section>
          )}
        </>
      ) : (
        <>
          <MenuBarExtra.Section title="Swinsian">
            <MenuBarExtra.Item title="Nothing Playing" icon={Icon.Music} onAction={activateApp} />
            <MenuBarExtra.Item title="Open Swinsian" icon={Icon.AppWindowList} onAction={activateApp} />
          </MenuBarExtra.Section>
          {prefs.showOpenCommandsSection && (
            <MenuBarExtra.Section title="Actions">{raycastSubmenu}</MenuBarExtra.Section>
          )}
        </>
      )}
    </MenuBarExtra>
  );
}
