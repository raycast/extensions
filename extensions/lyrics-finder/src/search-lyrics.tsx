import React, { useState, useEffect } from "react";
import { Action, ActionPanel, Detail, List, showToast, Toast } from "@raycast/api";
import SpotifyWebApi from "spotify-web-api-node";

// Import genius-lyrics
import { Client as GeniusClient } from "genius-lyrics";

// Spotify API configuration
const spotifyApi = new SpotifyWebApi({
  clientId: "1ccb4f5713f8424986d613b49e337a73",
  clientSecret: "e941a3e941aa4e4d98b686c72e9d223e",
});

let spotifyTokenExpiry = 0;

// Spotify authentication function
async function authenticateSpotify(): Promise<boolean> {
  try {
    if (Date.now() < spotifyTokenExpiry) {
      return true; // Token still valid
    }

    const response = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(response.body.access_token);
    spotifyTokenExpiry = Date.now() + response.body.expires_in * 1000 - 60000; // Refresh 1 min early
    console.log("✅ Spotify authenticated successfully");
    return true;
  } catch (error) {
    console.error("❌ Spotify authentication failed:", error);
    return false;
  }
}

// Spotify search functions
async function searchSpotifyTracks(query: string, limit: number = 20): Promise<Song[]> {
  try {
    const authenticated = await authenticateSpotify();
    if (!authenticated) return [];

    const searchResults = await spotifyApi.searchTracks(query, { limit, market: "IN" });
    const tracks = searchResults.body.tracks?.items || [];

    return tracks.map((track) => ({
      id: track.id,
      title: track.name,
      artist: {
        name: track.artists[0]?.name || "Unknown Artist",
      },
      album: track.album ? { name: track.album.name } : undefined,
      url: track.external_urls.spotify,
      thumbnail: track.album?.images[0]?.url || "🎵",
      fullSong: track,
    }));
  } catch (error) {
    console.error("Spotify track search error:", error);
    return [];
  }
}

async function searchSpotifyArtists(query: string, limit: number = 10): Promise<Artist[]> {
  try {
    const authenticated = await authenticateSpotify();
    if (!authenticated) return [];

    const searchResults = await spotifyApi.searchArtists(query, { limit, market: "IN" });
    const artists = searchResults.body.artists?.items || [];

    return artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      url: artist.external_urls.spotify,
      thumbnail: artist.images[0]?.url || "👨‍🎤",
      followers: artist.followers?.total,
      genres: artist.genres,
      popularity: artist.popularity,
      fullArtist: artist,
    }));
  } catch (error) {
    console.error("Spotify artist search error:", error);
    return [];
  }
}

async function getSpotifyArtistTopTracks(artistId: string): Promise<Song[]> {
  try {
    const authenticated = await authenticateSpotify();
    if (!authenticated) return [];

    // Get top tracks (limited to 10 by Spotify)
    const topTracks = await spotifyApi.getArtistTopTracks(artistId, "IN");
    const tracks = topTracks.body.tracks || [];

    return tracks.map((track) => ({
      id: track.id,
      title: track.name,
      artist: {
        name: track.artists[0]?.name || "Unknown Artist",
      },
      album: track.album ? { name: track.album.name } : undefined,
      url: track.external_urls.spotify,
      thumbnail: track.album?.images[0]?.url || "🎵",
      fullSong: track,
    }));
  } catch (error) {
    console.error("Spotify artist top tracks error:", error);
    return [];
  }
}

async function getSpotifyArtistTopTracksAndNewReleases(artistId: string): Promise<Song[]> {
  try {
    const authenticated = await authenticateSpotify();
    if (!authenticated) return [];

    const allSongs: Song[] = [];
    const seenTrackIds = new Set<string>();

    // Step 1: Get top 20 tracks first
    console.log(`🎵 Getting top tracks for artist...`);
    const topTracks = await spotifyApi.getArtistTopTracks(artistId, "IN");
    const tracks = topTracks.body.tracks || [];

    // Add top tracks (up to 10 available from Spotify API)
    tracks.forEach((track) => {
      if (!seenTrackIds.has(track.id)) {
        seenTrackIds.add(track.id);
        allSongs.push({
          id: track.id,
          title: track.name,
          artist: {
            name: track.artists[0]?.name || "Unknown Artist",
          },
          album: track.album ? { name: track.album.name } : undefined,
          url: track.external_urls.spotify,
          thumbnail: track.album?.images[0]?.url || "🎵",
          fullSong: track,
          isTopTrack: true, // Mark as top track
        });
      }
    });

    console.log(`✅ Added ${allSongs.length} top tracks`);

    // Step 2: Get new releases (recent albums and singles)
    console.log(`🆕 Getting new releases for artist...`);
    const albumsResponse = await spotifyApi.getArtistAlbums(artistId, {
      include_groups: "album,single",
      market: "IN",
      limit: 20, // Get recent releases
    });

    const albums = albumsResponse.body.items || [];

    // Sort albums by release date (newest first)
    const sortedAlbums = albums.sort((a, b) => {
      const dateA = new Date(a.release_date || "1900-01-01");
      const dateB = new Date(b.release_date || "1900-01-01");
      return dateB.getTime() - dateA.getTime();
    });

    // Get tracks from recent albums (prioritize newer releases)
    for (const album of sortedAlbums.slice(0, 8)) {
      // Limit to 8 most recent albums
      try {
        const tracksResponse = await spotifyApi.getAlbumTracks(album.id, {
          market: "IN",
          limit: 10, // Limit tracks per album to get variety
        });

        const albumTracks = tracksResponse.body.items || [];

        for (const track of albumTracks) {
          // Skip if we already have this track (avoid duplicates with top tracks)
          if (seenTrackIds.has(track.id)) {
            continue;
          }

          seenTrackIds.add(track.id);
          allSongs.push({
            id: track.id,
            title: track.name,
            artist: {
              name: track.artists[0]?.name || "Unknown Artist",
            },
            album: { name: album.name },
            url: track.external_urls.spotify,
            thumbnail: album.images[0]?.url || "🎵",
            fullSong: track,
            isTopTrack: false, // Mark as new release
          });

          // Stop if we reach reasonable limit (top tracks + 40 new releases = ~50 total)
          if (allSongs.length >= 50) {
            console.log(`🎵 Reached 50 songs limit, stopping`);
            return allSongs;
          }
        }
      } catch (albumError) {
        console.log(`Failed to get tracks for album ${album.name}:`, albumError);
      }
    }

    console.log(
      `✅ Total songs collected: ${allSongs.length} (${tracks.length} top tracks + ${allSongs.length - tracks.length} new releases)`
    );
    return allSongs;
  } catch (error) {
    console.error("Spotify artist tracks and releases error:", error);
    return [];
  }
}

// Enhanced song interface with multiple sources
interface LyricsSource {
  name: string;
  lyrics: string;
  url?: string;
}

interface Artist {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
  fullArtist?: any;
  followers?: number;
  genres?: string[];
  popularity?: number;
}

interface Song {
  id: number;
  title: string;
  artist: {
    name: string;
  };
  album?: {
    name: string;
  };
  url: string;
  thumbnail?: string;
  fullSong?: any;
  availableSources?: LyricsSource[];
  isTopTrack?: boolean; // Indicates if this is a top track vs new release
}

type SearchMode = "song" | "artist";

export default function SearchLyrics() {
  const [searchText, setSearchText] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>("song");

  // Search for songs or artists when search text or mode changes
  useEffect(() => {
    const performSearch = async () => {
      if (!searchText || searchText.trim().length < 2) {
        setSongs([]);
        return;
      }

      setIsLoading(true);
      try {
        let searchResults: Song[] = [];

        if (searchMode === "song") {
          // Use Spotify for better song search results
          console.log(`🎵 Searching Spotify for songs: "${searchText}"`);
          const spotifyResults = await searchSpotifyTracks(searchText, 15);

          if (spotifyResults.length > 0) {
            // Remove duplicates by song ID and title combination
            const uniqueSongs = [];
            const seenKeys = new Set();

            for (const song of spotifyResults) {
              const uniqueKey = `${song.id}-${song.title.toLowerCase()}-${song.artist.name.toLowerCase()}`;
              if (!seenKeys.has(uniqueKey)) {
                seenKeys.add(uniqueKey);
                uniqueSongs.push(song);
              }
            }

            searchResults = uniqueSongs;
            console.log(`✅ Found ${searchResults.length} unique songs on Spotify`);
          } else {
            // Fallback to Genius if Spotify fails
            console.log(`⚠️ Spotify search failed, trying Genius...`);
            if (!GeniusClient) {
              throw new Error("Both Spotify and Genius unavailable");
            }
            const client = new GeniusClient();
            const searches = await client.songs.search(searchText);
            searchResults = searches.slice(0, 10).map((song: any) => ({
              id: song.id,
              title: song.title,
              artist: {
                name: song.artist.name,
              },
              album: song.album ? { name: song.album.name } : undefined,
              url: song.url,
              thumbnail: song.thumbnail,
              fullSong: song,
            }));
          }
        } else if (searchMode === "artist") {
          // If no artist is selected, search for artists
          if (!selectedArtist) {
            // Use Spotify for better artist search
            console.log(`👨‍🎤 Searching Spotify for artists: "${searchText}"`);
            const spotifyArtists = await searchSpotifyArtists(searchText, 10);

            if (spotifyArtists.length > 0) {
              setArtists(spotifyArtists);
              setSongs([]); // Clear songs when showing artists
              console.log(`✅ Found ${spotifyArtists.length} artists on Spotify`);
              return;
            } else {
              // Fallback to Genius if Spotify fails
              console.log(`⚠️ Spotify artist search failed, trying Genius...`);
              if (!GeniusClient) {
                throw new Error("Both Spotify and Genius unavailable");
              }
              const client = new GeniusClient();
              const searches = await client.songs.search(searchText);

              // Extract unique artists from search results
              const artistMap = new Map<string, Artist>();

              searches.forEach((song: any) => {
                const artistName = song.artist.name;
                const artistId = song.artist.id;

                if (!artistMap.has(artistName)) {
                  artistMap.set(artistName, {
                    id: artistId.toString(),
                    name: artistName,
                    url:
                      song.artist.url ||
                      `https://genius.com/artists/${artistName.replace(/\s+/g, "-")}`,
                    thumbnail: song.artist.image_url || song.thumbnail || "👨‍🎤",
                    fullArtist: song.artist,
                  });
                }
              });

              const uniqueArtists = Array.from(artistMap.values())
                .slice(0, 10) // Show top 10 artists
                .sort((a, b) => a.name.localeCompare(b.name));

              setArtists(uniqueArtists);
              setSongs([]); // Clear songs when showing artists
              return;
            }
          } else {
            // Artist is selected, fetch their songs (top tracks + new releases)
            console.log(`🎵 Getting top tracks and new releases for: ${selectedArtist.name}`);

            // Try Spotify first for artist's top tracks and new releases
            const spotifyTracksAndReleases = await getSpotifyArtistTopTracksAndNewReleases(
              selectedArtist.id
            );
            if (spotifyTracksAndReleases.length > 0) {
              searchResults = spotifyTracksAndReleases;
              console.log(
                `✅ Found ${spotifyTracksAndReleases.length} tracks for ${selectedArtist.name} on Spotify (top tracks + new releases)`
              );
            } else {
              // Fallback to just top tracks if new method fails
              const spotifyTopTracks = await getSpotifyArtistTopTracks(selectedArtist.id);
              if (spotifyTopTracks.length > 0) {
                searchResults = spotifyTopTracks;
                console.log(
                  `✅ Found ${spotifyTopTracks.length} top tracks for ${selectedArtist.name} on Spotify (fallback)`
                );
              }
            }

            // Fallback to Genius if Spotify fails or no tracks found
            if (searchResults.length === 0) {
              console.log(`⚠️ Spotify tracks failed, trying Genius for ${selectedArtist.name}...`);
              try {
                if (selectedArtist.fullArtist && selectedArtist.fullArtist.songs) {
                  // Use Genius artist API if available
                  const artistSongs = await selectedArtist.fullArtist.songs({
                    sort: "popularity",
                    per_page: 100,
                  });

                  searchResults = artistSongs.map((song: any) => ({
                    id: song.id,
                    title: song.title,
                    artist: {
                      name: song.artist.name,
                    },
                    album: song.album ? { name: song.album.name } : undefined,
                    url: song.url,
                    thumbnail: song.thumbnail,
                    fullSong: song,
                  }));
                }
              } catch (artistError) {
                // Final fallback: search for songs by artist name
                if (GeniusClient) {
                  const client = new GeniusClient();
                  const searches = await client.songs.search(selectedArtist.name);
                  const artistSongs = searches.filter(
                    (song: any) =>
                      song.artist.name.toLowerCase() === selectedArtist.name.toLowerCase()
                  );

                  searchResults = artistSongs.slice(0, 100).map((song: any) => ({
                    id: song.id,
                    title: song.title,
                    artist: {
                      name: song.artist.name,
                    },
                    album: song.album ? { name: song.album.name } : undefined,
                    url: song.url,
                    thumbnail: song.thumbnail,
                    fullSong: song,
                  }));
                }
              }
            }
          }
        }

        setSongs(searchResults);
        setArtists([]); // Clear artists when showing songs
      } catch (error) {
        console.error("Search error:", error);
        setSongs([]);
        setArtists([]);
        showToast({
          style: Toast.Style.Failure,
          title: "Search Error",
          message: `Failed to search for ${searchMode}s. Please try again.`,
        });
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchText, searchMode, selectedArtist]);

  // Reset states when changing search modes
  useEffect(() => {
    setSelectedArtist(null);
    setArtists([]);
    setSongs([]);
  }, [searchMode]);

  // If a song is selected, show the lyrics view
  if (selectedSong) {
    return React.createElement(LyricsView, {
      song: selectedSong,
      onBack: () => setSelectedSong(null),
    });
  }

  // Show the search/autocomplete view
  return React.createElement(
    List,
    {
      isLoading: isLoading,
      onSearchTextChange: setSearchText,
      searchBarPlaceholder:
        searchMode === "song"
          ? "Search for songs... (e.g., 'Bohemian Rhapsody', 'Hotel California')"
          : searchMode === "artist"
            ? "Search for artists... (e.g., 'Queen', 'Eagles', 'The Beatles')"
            : "Search Tamil lyrics... (e.g., 'happy birthday', 'vennilave', 'yaaro yarodi')",
      throttle: true,
      searchBarAccessory: React.createElement(
        List.Dropdown,
        {
          tooltip: "Search Mode",
          storeValue: true,
          onChange: (newValue: string) => {
            setSearchMode(newValue as SearchMode);
            setSongs([]); // Clear results when switching modes
          },
        },
        React.createElement(List.Dropdown.Item, {
          title: "🎵 Song",
          value: "song",
        }),
        React.createElement(List.Dropdown.Item, {
          title: "👨‍🎤 Artist",
          value: "artist",
        })
      ),
    },
    // Show different content based on current state
    searchMode === "artist" && !selectedArtist && artists.length === 0 && searchText.length < 2
      ? React.createElement(List.EmptyView, {
          icon: "👨‍🎤",
          title: "Search for Artists",
          description: "Type at least 2 characters to start searching for artists",
        })
      : searchMode === "artist" && !selectedArtist && artists.length === 0
        ? React.createElement(List.EmptyView, {
            icon: "👨‍🎤",
            title: "No Artists Found",
            description: "No artists found. Try a different search term.",
          })
        : searchMode === "artist" && selectedArtist && songs.length === 0
          ? React.createElement(List.EmptyView, {
              icon: "🎵",
              title: `${selectedArtist.name}'s Songs`,
              description: "Loading songs...",
            })
          : searchMode === "song" && songs.length === 0 && searchText.length < 2
            ? React.createElement(List.EmptyView, {
                icon: "🎵",
                title: "Search for Song Lyrics",
                description: "Type at least 2 characters to start searching for songs",
              })
            : React.createElement(List.EmptyView, {
                icon: searchMode === "song" ? "🎵" : "👨‍🎤",
                title: "No Songs Found",
                description:
                  searchMode === "song"
                    ? "No songs found. Try a different search term."
                    : "No songs found for this artist.",
              }),

    // Show artists when in artist mode and no artist is selected
    ...(searchMode === "artist" && !selectedArtist
      ? artists.map((artist) => {
          const subtitle = [];
          if (artist.followers) {
            subtitle.push(`${(artist.followers / 1000000).toFixed(1)}M followers`);
          }
          if (artist.genres && artist.genres.length > 0) {
            subtitle.push(artist.genres.slice(0, 2).join(", "));
          }
          if (artist.popularity) {
            subtitle.push(`${artist.popularity}% popularity`);
          }

          return React.createElement(List.Item, {
            key: `artist-${artist.id}-${artist.name}`,
            title: artist.name,
            subtitle: subtitle.length > 0 ? subtitle.join(" • ") : "Artist",
            icon: artist.thumbnail || "👨‍🎤",
            accessories: [
              ...(artist.followers
                ? [{ text: `${(artist.followers / 1000000).toFixed(1)}M` }]
                : []),
            ],
            actions: React.createElement(
              ActionPanel,
              {},
              React.createElement(Action, {
                title: "View Artist's Songs",
                onAction: () => {
                  setSelectedArtist(artist);
                  setSearchText(artist.name); // Trigger search for artist's songs
                },
              }),
              React.createElement(Action.OpenInBrowser, {
                title: artist.url.includes("spotify") ? "Open on Spotify" : "Open Artist Page",
                url: artist.url,
                shortcut: { modifiers: ["cmd"], key: "o" },
              }),
              React.createElement(Action.CopyToClipboard, {
                title: "Copy Artist Name",
                content: artist.name,
                shortcut: { modifiers: ["cmd"], key: "c" },
              })
            ),
          });
        })
      : []),

    // Show songs (either from song search, artist's songs)
    ...songs.map((song) => {
      const isSpotifySource = song.url && song.url.includes("spotify");
      const accessories = [];

      if (song.album?.name) {
        accessories.push({ text: song.album.name });
      }

      return React.createElement(List.Item, {
        key: `song-${song.id}-${song.title}`,
        title: song.title,
        subtitle: song.artist.name,
        accessories: accessories,
        icon: song.thumbnail || "🎵",
        actions: React.createElement(
          ActionPanel,
          {},
          React.createElement(Action, {
            title: "View Lyrics",
            onAction: () => setSelectedSong(song),
          }),
          ...(selectedArtist
            ? [
                React.createElement(Action, {
                  title: "Back to Artists",
                  onAction: () => {
                    setSelectedArtist(null);
                    setSearchText(""); // Clear search to go back to artist search
                  },
                  shortcut: { modifiers: ["cmd"], key: "b" },
                }),
              ]
            : []),
          React.createElement(Action.OpenInBrowser, {
            title: isSpotifySource ? "Open on Spotify" : "Open on Genius",
            url: song.url,
            shortcut: { modifiers: ["cmd"], key: "o" },
          }),
          React.createElement(Action.CopyToClipboard, {
            title: "Copy Song Info",
            content: `${song.title} by ${song.artist.name}${song.album?.name ? ` (${song.album.name})` : ""}`,
            shortcut: { modifiers: ["cmd"], key: "c" },
          })
        ),
      });
    })
  );
}

// Enhanced lyrics fetching functions
async function searchAltLyrics(songTitle: string, artistName: string): Promise<LyricsSource[]> {
  const sources: LyricsSource[] = [];

  try {
    console.log(`Searching alternative sources for: ${songTitle} by ${artistName}`);

    // Fallback message if no alternative sources found
    sources.push({
      name: "Suggestion",
      lyrics: `We couldn't find lyrics for "${songTitle}" by ${artistName}.\n\n🎵 **Try these search strategies:**\n\n• Check the song title spelling\n• Include the album name in your search\n• Try searching with different variations of the artist name\n• Look for the song on music streaming platforms first\n\n🌐 **Alternative sources to try:**\n• AZLyrics.com\n• MetroLyrics.com\n• Google Search for "[song title] [artist] lyrics"\n• Official artist website or social media`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`${songTitle} ${artistName} lyrics`)}`,
    });
  } catch (error) {
    console.error("Error searching alternative lyrics:", error);
  }

  return sources;
}

// Component to show lyrics for a selected song
function LyricsView({ song, onBack }: { song: Song; onBack: () => void }) {
  const [lyrics, setLyrics] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchLyrics = async () => {
      try {
        setIsLoading(true);
        setError("");

        let lyricsFound = false;

        // Try Genius for regular songs
        try {
          // If we have a Genius song object, use it directly
          if (song.fullSong && song.fullSong.lyrics) {
            const lyricsText = await song.fullSong.lyrics();
            if (lyricsText && lyricsText.trim() !== "") {
              setLyrics(lyricsText);
              lyricsFound = true;
              console.log("✅ Using Genius lyrics from fullSong object");
            }
          } else {
            // For Spotify songs or when Genius object is not available, search Genius by title/artist
            console.log(`🔍 Searching Genius for: "${song.title}" by "${song.artist.name}"`);
            if (GeniusClient) {
              const client = new GeniusClient();
              const searchResults = await client.songs.search(`${song.title} ${song.artist.name}`);

              if (searchResults && searchResults.length > 0) {
                // Find the best match (exact title match preferred)
                let bestMatch = searchResults[0];
                for (const result of searchResults) {
                  if (
                    result.title.toLowerCase() === song.title.toLowerCase() &&
                    result.artist.name.toLowerCase() === song.artist.name.toLowerCase()
                  ) {
                    bestMatch = result;
                    break;
                  }
                }

                console.log(`🎯 Found match: "${bestMatch.title}" by "${bestMatch.artist.name}"`);
                const lyricsText = await bestMatch.lyrics();
                if (lyricsText && lyricsText.trim() !== "") {
                  setLyrics(lyricsText);
                  lyricsFound = true;
                  console.log("✅ Using Genius lyrics from search");
                }
              }
            }
          }
        } catch (geniusError) {
          console.log("Genius lyrics not available", geniusError);
        }

        // If Genius fails, search alternative sources
        if (!lyricsFound) {
          console.log("Searching alternative lyrics sources...");
          const altSources = await searchAltLyrics(song.title, song.artist.name);

          if (altSources.length > 0) {
            setLyrics(altSources[0].lyrics);
          } else {
            throw new Error("Lyrics not available from any source");
          }
        }
      } catch (err: any) {
        console.error("Error fetching lyrics:", err);
        setError(err.message || "Failed to fetch lyrics. Please try again.");
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: err.message || "Failed to fetch lyrics",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLyrics();
  }, [song]);

  const markdown = () => {
    if (error) {
      return `# Error\n\n${error}\n\n## Tips:\n- Try searching for a different version of the song\n- Check if the song is available on Genius\n- Some songs may not have lyrics available`;
    }

    if (!lyrics) {
      return `# Loading lyrics for "${song.title}"\n\nPlease wait while we fetch the lyrics...`;
    }

    return `# ${song.title}\n\n**Artist:** ${song.artist.name}\n\n${song.album?.name ? `**Album:** ${song.album.name}\n\n` : ""}---\n\n${lyrics
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .join("\n\n")}`;
  };

  const actions = [
    React.createElement(Action, {
      title: "Back to Search",
      onAction: onBack,
      shortcut: { modifiers: ["cmd"], key: "b" },
    }),
    React.createElement(Action.OpenInBrowser, {
      title: "Open on Genius",
      url: song.url,
      shortcut: { modifiers: ["cmd"], key: "o" },
    }),
  ];

  if (lyrics) {
    actions.push(
      React.createElement(Action.CopyToClipboard, {
        title: "Copy Lyrics",
        content: lyrics,
        shortcut: { modifiers: ["cmd"], key: "c" },
      }),
      React.createElement(Action.CopyToClipboard, {
        title: "Copy Song Info",
        content: `${song.title} by ${song.artist.name}`,
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
      })
    );
  }

  return React.createElement(Detail, {
    isLoading: isLoading,
    markdown: markdown(),
    navigationTitle: `${song.title} - ${song.artist.name}`,
    actions: React.createElement(ActionPanel, {}, ...actions),
  });
}
