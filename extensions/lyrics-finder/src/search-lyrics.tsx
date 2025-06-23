// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Action, ActionPanel, Detail, List, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import SpotifyWebApi from "spotify-web-api-node";
import axios from "axios";
import * as cheerio from "cheerio";

// Import genius-lyrics
import { Client as GeniusClient } from "genius-lyrics";

interface Preferences {
  geniusApiKey?: string;
  spotifyClientId: string;
  spotifyClientSecret: string;
}

// Get user preferences
const preferences = getPreferenceValues<Preferences>();

// Spotify API configuration
const spotifyApi = new SpotifyWebApi({
  clientId: preferences.spotifyClientId,
  clientSecret: preferences.spotifyClientSecret,
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
  isTamilMode?: boolean; // Indicates if this should use Tamil lyrics search
}

type SearchMode = "song" | "artist" | "tamil";

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
        } else if (searchMode === "tamil") {
          // Tamil search mode - use Spotify for song discovery
          console.log(`🇮🇳 Searching Tamil songs: "${searchText}"`);
          const spotifyResults = await searchSpotifyTracks(searchText, 15);

          if (spotifyResults.length > 0) {
            // Remove duplicates and mark for Tamil lyrics
            const uniqueSongs = [];
            const seenKeys = new Set();

            for (const song of spotifyResults) {
              const uniqueKey = `${song.id}-${song.title.toLowerCase()}-${song.artist.name.toLowerCase()}`;
              if (!seenKeys.has(uniqueKey)) {
                seenKeys.add(uniqueKey);
                // Mark songs for Tamil lyrics handling
                uniqueSongs.push({
                  ...song,
                  isTamilMode: true, // Custom flag to indicate Tamil lyrics search
                });
              }
            }

            searchResults = uniqueSongs;
            console.log(`✅ Found ${searchResults.length} songs for Tamil lyrics search`);
          } else {
            console.log(`⚠️ No Spotify results found for Tamil search`);
            searchResults = [];
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
                    url: song.artist.url || `https://genius.com/artists/${artistName.replace(/\s+/g, "-")}`,
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
            const spotifyTracksAndReleases = await getSpotifyArtistTopTracksAndNewReleases(selectedArtist.id);
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
                    (song: any) => song.artist.name.toLowerCase() === selectedArtist.name.toLowerCase()
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
        showFailureToast("Search Error", `Failed to search for ${searchMode}s. Please try again.`);
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
  const emptyView =
    searchMode === "artist" && !selectedArtist && artists.length === 0 && searchText.length < 2
      ? React.createElement(List.EmptyView as any, {
          icon: "👨‍🎤",
          title: "Search for Artists",
          description: "Type at least 2 characters to start searching for artists",
        })
      : searchMode === "artist" && !selectedArtist && artists.length === 0
        ? React.createElement(List.EmptyView as any, {
            icon: "👨‍🎤",
            title: "No Artists Found",
            description: "No artists found. Try a different search term.",
          })
        : searchMode === "artist" && selectedArtist && songs.length === 0
          ? React.createElement(List.EmptyView as any, {
              icon: "🎵",
              title: `${selectedArtist.name}'s Songs`,
              description: "Loading songs...",
            })
          : searchMode === "song" && songs.length === 0 && searchText.length < 2
            ? React.createElement(List.EmptyView as any, {
                icon: "🎵",
                title: "Search for Song Lyrics",
                description: "Type at least 2 characters to start searching for songs",
              })
            : React.createElement(List.EmptyView as any, {
                icon: searchMode === "song" ? "🎵" : "👨‍🎤",
                title: "No Songs Found",
                description:
                  searchMode === "song"
                    ? "No songs found. Try a different search term."
                    : "No songs found for this artist.",
              });

  const children = [];

  // Add empty view if needed
  if (
    (searchMode === "artist" && !selectedArtist && artists.length === 0) ||
    (searchMode === "song" && songs.length === 0) ||
    (searchMode === "artist" && selectedArtist && songs.length === 0)
  ) {
    children.push(emptyView);
  }

  // Add artists when in artist mode and no artist is selected
  if (searchMode === "artist" && !selectedArtist) {
    artists.forEach((artist) => {
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

      children.push(
        React.createElement(List.Item as any, {
          key: `artist-${artist.id}-${artist.name}`,
          title: artist.name,
          subtitle: subtitle.length > 0 ? subtitle.join(" • ") : "Artist",
          icon: artist.thumbnail || "👨‍🎤",
          accessories: [...(artist.followers ? [{ text: `${(artist.followers / 1000000).toFixed(1)}M` }] : [])],
          actions: React.createElement(
            ActionPanel as any,
            {},
            React.createElement(Action as any, {
              title: "View Artist's Songs",
              onAction: () => {
                setSelectedArtist(artist);
                setSearchText(artist.name); // Trigger search for artist's songs
              },
            }),
            React.createElement(Action.OpenInBrowser as any, {
              title: artist.url.includes("spotify") ? "Open on Spotify" : "Open Artist Page",
              url: artist.url,
              shortcut: { modifiers: ["cmd"], key: "o" },
            }),
            React.createElement(Action.CopyToClipboard as any, {
              title: "Copy Artist Name",
              content: artist.name,
              shortcut: { modifiers: ["cmd"], key: "c" },
            })
          ),
        })
      );
    });
  }

  // Add songs (either from song search, artist's songs)
  songs.forEach((song) => {
    const isSpotifySource = song.url && song.url.includes("spotify");
    const accessories = [];

    if (song.album?.name) {
      accessories.push({ text: song.album.name });
    }

    const actions = [
      React.createElement(Action, {
        title: "View Lyrics",
        onAction: () => setSelectedSong(song),
      }),
    ];

    if (selectedArtist) {
      actions.push(
        React.createElement(Action, {
          title: "Back to Artists",
          onAction: () => {
            setSelectedArtist(null);
            setSearchText(""); // Clear search to go back to artist search
          },
          shortcut: { modifiers: ["cmd"], key: "b" },
        })
      );
    }

    actions.push(
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
    );

    children.push(
      React.createElement(List.Item, {
        key: `song-${song.id}-${song.title}`,
        title: song.title,
        subtitle: song.artist.name,
        accessories: accessories,
        icon: song.thumbnail || "🎵",
        actions: React.createElement(ActionPanel, {}, ...actions),
      })
    );
  });

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
            : searchMode === "tamil"
              ? "Search Tamil songs... (e.g., 'Vennilave', 'Yaaro Yarodi', 'Tum Hi Ho')"
              : "Search songs...",
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
        }),
        React.createElement(List.Dropdown.Item, {
          title: "🇮🇳 Tamil",
          value: "tamil",
        })
      ),
    },
    ...children
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

// Tamil lyrics search function
async function searchTamilLyrics(songTitle: string, artistName: string): Promise<LyricsSource[]> {
  const sources: LyricsSource[] = [];

  try {
    console.log(`🇮🇳 Searching Tamil lyrics for: ${songTitle} by ${artistName}`);

    // Strategy 1: Try direct search on Tamil2Lyrics.com
    const directSearchUrl = `https://tamil2lyrics.com/?s=${encodeURIComponent(songTitle + " " + artistName)}`;

    try {
      console.log(`🔍 Trying direct search on tamil2lyrics.com: ${directSearchUrl}`);

      const searchResponse = await axios.get(directSearchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
        },
        timeout: 8000,
        maxContentLength: 1024 * 1024, // Limit to 1MB
      });

      const $ = cheerio.load(searchResponse.data);

      // Look for search results or direct lyrics content
      let firstResultUrl = "";

      // Try to find links to lyrics pages
      const searchResults = $('a[href*="tamil2lyrics.com"]').filter((index, element) => {
        const href = $(element).attr("href") || "";
        const text = $(element).text().toLowerCase();
        return (
          href.includes("tamil2lyrics.com") &&
          !href.includes("/search") &&
          !href.includes("/?s=") &&
          (text.includes(songTitle.toLowerCase()) || text.includes("lyric"))
        );
      });

      if (searchResults.length > 0) {
        firstResultUrl = $(searchResults.first()).attr("href") || "";
        console.log(`🎯 Found direct search result: ${firstResultUrl}`);
      }

      // If we found a direct result, try to get lyrics from it
      if (firstResultUrl && firstResultUrl.startsWith("http")) {
        console.log(`📖 Fetching lyrics from: ${firstResultUrl}`);

        const lyricsResponse = await axios.get(firstResultUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          timeout: 8000,
          maxContentLength: 512 * 1024, // Limit to 512KB
        });

        const lyricsPage = cheerio.load(lyricsResponse.data);
        const lyricsText = await extractLyricsFromPage(lyricsPage);

        if (lyricsText) {
          sources.push({
            name: "Tamil2Lyrics.com",
            lyrics: lyricsText,
            url: firstResultUrl,
          });
          console.log("✅ Successfully extracted Tamil lyrics from direct search");
          return sources;
        }
      }
    } catch (directError) {
      console.log("⚠️ Direct search failed, trying alternative approach");
    }

    // Strategy 2: Try a simpler Google search approach
    const searchQuery = `"${songTitle}" "${artistName}" tamil lyrics`;
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery + " site:tamil2lyrics.com")}`;

    console.log(`🔍 Trying Google search: ${searchQuery}`);

    const searchResponse = await axios.get(googleSearchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 6000,
      maxContentLength: 512 * 1024, // Limit to 512KB
    });

    const $ = cheerio.load(searchResponse.data);

    // Look for links to tamil2lyrics.com in search results
    let bestUrl = "";
    $("a").each((index, element) => {
      const href = $(element).attr("href") || "";
      let actualUrl = "";

      // Handle Google's URL encoding
      if (href.startsWith("/url?q=")) {
        try {
          const urlParams = new URLSearchParams(href.substring(6));
          actualUrl = urlParams.get("q") || "";
        } catch (e) {
          return;
        }
      } else if (href.startsWith("http")) {
        actualUrl = href;
      }

      // Check if this is a valid tamil2lyrics.com URL
      if (
        actualUrl.includes("tamil2lyrics.com") &&
        !actualUrl.includes("/search") &&
        !actualUrl.includes("accounts.google.com") &&
        actualUrl.startsWith("http")
      ) {
        bestUrl = actualUrl;
        return false; // Break the loop
      }
    });

    if (!bestUrl) {
      console.log("❌ No valid tamil2lyrics.com results found");
      sources.push({
        name: "Tamil Lyrics Search",
        lyrics: `No Tamil lyrics found for "${songTitle}" by ${artistName}".\n\n🔍 **Search suggestions:**\n\n• Try searching with different spelling variations\n• Check if it's a Tamil song (this search is specifically for Tamil lyrics)\n• Try searching for the movie name if it's a film song\n• Some songs might not be available on tamil2lyrics.com\n\n🌐 **Manual search:**\nTry searching manually: https://tamil2lyrics.com/?s=${encodeURIComponent(songTitle + " " + artistName)}`,
        url: `https://tamil2lyrics.com/?s=${encodeURIComponent(songTitle + " " + artistName)}`,
      });
      return sources;
    }

    console.log(`🎯 Found tamil2lyrics.com URL: ${bestUrl}`);

    // Fetch the lyrics page with memory limits
    const lyricsResponse = await axios.get(bestUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 8000,
      maxContentLength: 512 * 1024, // Limit to 512KB
    });

    const lyricsPage = cheerio.load(lyricsResponse.data);
    const lyricsText = await extractLyricsFromPage(lyricsPage);

    if (lyricsText) {
      sources.push({
        name: "Tamil2Lyrics.com",
        lyrics: lyricsText,
        url: bestUrl,
      });
      console.log("✅ Successfully extracted Tamil lyrics");
    } else {
      sources.push({
        name: "Tamil2Lyrics.com",
        lyrics: `Found a Tamil lyrics page but couldn't extract the lyrics automatically.\n\n📖 **Page found:** ${bestUrl}\n\n🔍 **Manual check needed:**\nPlease visit the link above to view the lyrics manually.\n\nThis might happen if:\n• The website structure has changed\n• The page requires JavaScript to load content\n• The lyrics are in an image format`,
        url: bestUrl,
      });
      console.log("⚠️ Found page but could not extract lyrics");
    }
  } catch (error) {
    console.error("Error searching Tamil lyrics:", error);
    sources.push({
      name: "Tamil Lyrics Search Error",
      lyrics: `Failed to search Tamil lyrics for "${songTitle}" by ${artistName}".\n\n❌ **Error occurred:**\n${error.message}\n\n🔄 **Try again:**\n• Check your internet connection\n• Try a different search term\n• The website might be temporarily unavailable\n\n🌐 **Manual search:**\nTry searching manually: https://tamil2lyrics.com/?s=${encodeURIComponent(songTitle + " " + artistName)}`,
      url: `https://tamil2lyrics.com/?s=${encodeURIComponent(songTitle + " " + artistName)}`,
    });
  }

  return sources;
}

// Helper function to extract lyrics from a page
async function extractLyricsFromPage(lyricsPage: any): Promise<string> {
  // Common selectors for lyrics content on tamil2lyrics.com
  const possibleSelectors = [
    ".post-content",
    ".entry-content",
    ".content",
    "article .entry",
    ".lyrics",
    '[class*="lyric"]',
    ".post",
    "main .content",
    "#content .post",
  ];

  for (const selector of possibleSelectors) {
    try {
      const content = lyricsPage(selector).first();
      if (content.length > 0) {
        // Remove unwanted elements but preserve structure
        content
          .find("script, style, nav, header, footer, .navigation, .sidebar, .menu, .comment, .advertisement, .ads")
          .remove();

        let text = content.text().trim();

        // Clean up the text while preserving lyrics structure
        text = text
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .join("\n")
          .replace(/\n{3,}/g, "\n\n") // Max 2 consecutive newlines
          .trim();

        // Check if this looks like lyrics content
        if (text.length > 50 && text.split("\n").length > 3) {
          console.log(`✅ Found lyrics using selector: ${selector}`);
          return text.substring(0, 3000); // Limit to 3000 chars to avoid memory issues
        }
      }
    } catch (e) {
      continue;
    }
  }

  return "";
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
              const client = preferences.geniusApiKey ? new GeniusClient(preferences.geniusApiKey) : new GeniusClient();
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

        // If Genius fails, search alternative sources or Tamil lyrics
        if (!lyricsFound) {
          if (song.isTamilMode) {
            console.log("Searching Tamil lyrics sources...");
            const tamilSources = await searchTamilLyrics(song.title, song.artist.name);

            if (tamilSources.length > 0) {
              setLyrics(tamilSources[0].lyrics);
            } else {
              throw new Error("Tamil lyrics not available from any source");
            }
          } else {
            console.log("Searching alternative lyrics sources...");
            const altSources = await searchAltLyrics(song.title, song.artist.name);

            if (altSources.length > 0) {
              setLyrics(altSources[0].lyrics);
            } else {
              throw new Error("Lyrics not available from any source");
            }
          }
        }
      } catch (err: any) {
        console.error("Error fetching lyrics:", err);
        setError(err.message || "Failed to fetch lyrics. Please try again.");
        showFailureToast("Error", err.message || "Failed to fetch lyrics");
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
