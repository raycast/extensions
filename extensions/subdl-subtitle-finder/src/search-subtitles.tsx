import { ActionPanel, Action, List, Icon, showToast, Toast, getPreferenceValues, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import { subdlAPI, Subtitle } from "./api";
import { omdbAPI, MovieInfo } from "./utils/show-info";
import { SubtitleItem } from "./components/SubtitleItem";

interface Preferences {
  subdlApiKey: string;
  defaultLanguage?: string;
  downloadDirectory?: string;
  showMovieInfo?: boolean;
  omdbApiKey?: string;
}

// Popular movies for suggestions
const POPULAR_MOVIES = [
  "Inception",
  "The Dark Knight",
  "Interstellar",
  "Oppenheimer",
  "Barbie",
  "Mission Impossible",
  "Spider-Man",
  "Avengers",
  "Star Wars",
  "The Matrix",
  "Pulp Fiction",
  "Fight Club",
  "Forrest Gump",
  "The Shawshank Redemption",
  "The Godfather",
  "Dune",
  "Top Gun",
  "John Wick",
  "Fast and Furious",
  "Iron Man",
];

// More comprehensive movie/TV database for smart suggestions
const MOVIE_DATABASE = [
  "Inception",
  "The Dark Knight",
  "Interstellar",
  "Oppenheimer",
  "Barbie",
  "Mission Impossible",
  "Spider-Man",
  "Avengers",
  "Iron Man",
  "Thor",
  "Captain America",
  "Black Widow",
  "Hawkeye",
  "Star Wars",
  "The Matrix",
  "Pulp Fiction",
  "Fight Club",
  "Forrest Gump",
  "The Shawshank Redemption",
  "The Godfather",
  "Dune",
  "Top Gun",
  "John Wick",
  "Fast and Furious",
  "Transformers",
  "Batman",
  "Superman",
  "Wonder Woman",
  "Justice League",
  "Aquaman",
  "The Flash",
  "Game of Thrones",
  "Breaking Bad",
  "Stranger Things",
  "The Walking Dead",
  "Better Call Saul",
  "House of Cards",
  "Narcos",
  "Money Heist",
  "The Crown",
  "Ozark",
  "Squid Game",
  "Friends",
  "The Office",
  "How I Met Your Mother",
  "Big Bang Theory",
  "Seinfeld",
  "Lost",
  "Prison Break",
  "24",
  "Homeland",
  "Sherlock",
  "Doctor Who",
  "Westworld",
  "Black Mirror",
  "True Detective",
  "Fargo",
  "The Sopranos",
  "The Wire",
  "Mad Men",
  "Dexter",
  "Vikings",
  "The Mandalorian",
  "House of the Dragon",
  "The Witcher",
];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedQuality, setSelectedQuality] = useState<string>("");
  const [movieInfo, setMovieInfo] = useState<MovieInfo | null>(null);
  const [showMovieDetail, setShowMovieDetail] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const preferences = getPreferenceValues<Preferences>();

  const languages = [
    { code: "ar", name: "Arabic" },
    { code: "en", name: "English" },
    { code: "fr", name: "French" },
    { code: "es", name: "Spanish" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "zh", name: "Chinese" },
  ];

  const qualities = [
    { value: "", name: "All Qualities" },
    { value: "4k", name: "4K/2160p" },
    { value: "1080p", name: "1080p/Blu-ray" },
    { value: "720p", name: "720p/HD" },
    { value: "480p", name: "480p/DVD" },
    { value: "360p", name: "360p/SD" },
  ];

  // Generate smart suggestions based on search text
  const generateSuggestions = (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const filtered = MOVIE_DATABASE.filter((movie) => movie.toLowerCase().includes(query.toLowerCase())).slice(0, 5); // Limit to 5 suggestions

    setSuggestions(filtered);
  };

  const searchSubtitles = async (query: string, language?: string) => {
    if (!query.trim()) {
      setSubtitles([]);
      setHasSearched(false);
      setMovieInfo(null);
      setSuggestions([]);
      return;
    }

    if (!preferences.subdlApiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing API Key",
        message: "Please add your SubDL API key in preferences",
      });
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setSuggestions([]); // Clear suggestions when actually searching

    try {
      const response = await subdlAPI.searchSubtitles(query, preferences.subdlApiKey, language);
      setSubtitles(response.subtitles || []);

      // Fetch movie info if enabled
      if (preferences.showMovieInfo && preferences.omdbApiKey) {
        try {
          const info = await omdbAPI.searchMovie(query, preferences.omdbApiKey);
          setMovieInfo(info);
        } catch (movieError) {
          // Don't show error for movie info, just log it
          console.log("Movie info fetch failed:", movieError);
          setMovieInfo(null);
        }
      }

      // Show success toast if subtitles found
      if (response.subtitles && response.subtitles.length > 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "Subtitles found!",
          message: `Found ${response.subtitles.length} subtitle(s) for "${query}"`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Handle specific SubDL API errors
      if (errorMessage.includes("can't find movie or tv")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No results found",
          message: `No subtitles found for "${query}". Try a different search term.`,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: errorMessage,
        });
      }

      setSubtitles([]);
      setMovieInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search text changes with smart suggestions
  useEffect(() => {
    if (searchText && searchText.length >= 2 && !hasSearched) {
      generateSuggestions(searchText);
    } else if (!searchText) {
      setSuggestions([]);
      setSubtitles([]);
      setMovieInfo(null);
      setHasSearched(false);
    }
  }, [searchText]);

  // Handle actual search with debouncing
  useEffect(() => {
    if (searchText && searchText.length >= 3) {
      const timeoutId = setTimeout(() => {
        searchSubtitles(searchText, selectedLanguage || undefined);
      }, 800); // Increased delay for better UX

      return () => clearTimeout(timeoutId);
    }
  }, [searchText, selectedLanguage]);

  // Filter subtitles based on language and quality selection
  const filteredSubtitles = subtitles.filter((subtitle) => {
    // Language filter
    if (selectedLanguage) {
      const languageMap: { [key: string]: string[] } = {
        ar: ["arabic", "ara"],
        en: ["english", "eng"],
        fr: ["french", "fre", "fra"],
        es: ["spanish", "spa"],
        de: ["german", "ger", "deu"],
        it: ["italian", "ita"],
        pt: ["portuguese", "por"],
        ru: ["russian", "rus"],
        ja: ["japanese", "jpn"],
        ko: ["korean", "kor"],
        zh: ["chinese", "chi", "zho"],
      };

      const selectedLangNames = languageMap[selectedLanguage] || [selectedLanguage];
      const subtitleLang = subtitle.lang?.toLowerCase() || "";

      if (!selectedLangNames.some((lang) => subtitleLang.includes(lang))) {
        return false;
      }
    }

    // Quality filter
    if (selectedQuality) {
      const releaseName = subtitle.release_name?.toLowerCase() || "";
      const qualityLower = selectedQuality.toLowerCase();

      if (qualityLower === "1080p") {
        return releaseName.includes("1080p") || releaseName.includes("1080");
      } else if (qualityLower === "720p") {
        return releaseName.includes("720p") || releaseName.includes("720");
      } else if (qualityLower === "480p") {
        return releaseName.includes("480p") || releaseName.includes("480");
      } else if (qualityLower === "360p") {
        return releaseName.includes("360p") || releaseName.includes("360");
      } else if (qualityLower === "4k" || qualityLower === "2160p") {
        return releaseName.includes("2160p") || releaseName.includes("4k") || releaseName.includes("uhd");
      }
    }

    return true;
  });

  const handleRefresh = () => {
    if (searchText) {
      searchSubtitles(searchText, selectedLanguage || undefined);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchText(suggestion);
    setSuggestions([]);
    setHasSearched(false); // This will trigger the search
  };

  const MovieInfoItem = () => {
    if (!movieInfo) return null;

    const posterUrl = movieInfo.Poster && movieInfo.Poster !== "N/A" ? movieInfo.Poster : undefined;
    const rating = movieInfo.imdbRating && movieInfo.imdbRating !== "N/A" ? `⭐ ${movieInfo.imdbRating}/10` : "";
    const metascore = movieInfo.Metascore && movieInfo.Metascore !== "N/A" ? `📊 ${movieInfo.Metascore}/100` : "";
    const runtime = movieInfo.Runtime && movieInfo.Runtime !== "N/A" ? `⏱️ ${movieInfo.Runtime}` : "";

    const accessories = [];
    if (rating) accessories.push({ text: rating });
    if (metascore) accessories.push({ text: metascore });
    if (runtime) accessories.push({ text: runtime });

    return (
      <List.Item
        key="movie-info"
        icon={posterUrl || Icon.Video}
        title={movieInfo.Title}
        subtitle={`${movieInfo.Year} • ${movieInfo.Genre} • ${movieInfo.Rated || "Not Rated"}`}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action title="View Full Details" icon={Icon.Eye} onAction={() => setShowMovieDetail(true)} />
              <Action
                title="Copy Imdb Link"
                icon={Icon.Link}
                onAction={async () => {
                  if (movieInfo.imdbID) {
                    await navigator.clipboard.writeText(`https://www.imdb.com/title/${movieInfo.imdbID}/`);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Copied IMDb Link",
                      message: "IMDb link copied to clipboard",
                    });
                  }
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  const MovieDetail = () => {
    if (!movieInfo) return null;

    const posterSection =
      movieInfo.Poster && movieInfo.Poster !== "N/A"
        ? `<img src="${movieInfo.Poster}" alt="Movie Poster" width="300" style="border-radius: 8px; margin-bottom: 20px;" />\n\n`
        : "";

    const ratingsSection = movieInfo.Ratings?.length
      ? `\n## 📊 Ratings\n${movieInfo.Ratings.map((rating) => `- **${rating.Source}:** ${rating.Value}`).join("\n")}\n`
      : "";

    return (
      <Detail
        markdown={`# ${movieInfo.Title} (${movieInfo.Year})

${posterSection}## 📖 Overview
${movieInfo.Plot}

## 🎬 Production Details
- **Director:** ${movieInfo.Director}
- **Writers:** ${movieInfo.Writer}
- **Starring:** ${movieInfo.Actors}
- **Genre:** ${movieInfo.Genre}
- **Runtime:** ${movieInfo.Runtime}
- **Rating:** ${movieInfo.Rated || "Not Rated"}
- **Release Date:** ${movieInfo.Released}

## ⭐ User Scores
- **IMDb Rating:** ${movieInfo.imdbRating}/10 (${movieInfo.imdbVotes} votes)
- **Metascore:** ${movieInfo.Metascore}/100${ratingsSection}

## 💼 Additional Info
- **Box Office:** ${movieInfo.BoxOffice || "N/A"}
- **Production:** ${movieInfo.Production || "N/A"}
- **DVD Release:** ${movieInfo.DVD || "N/A"}
${movieInfo.Website && movieInfo.Website !== "N/A" ? `- **Official Website:** [${movieInfo.Website}](${movieInfo.Website})` : ""}

---
*Information provided by OMDb API*
        `}
        actions={
          <ActionPanel>
            <Action title="Back to Search" icon={Icon.ArrowLeft} onAction={() => setShowMovieDetail(false)} />
            <Action
              title="Open Imdb Page"
              icon={Icon.Globe}
              onAction={async () => {
                if (movieInfo.imdbID) {
                  await navigator.clipboard.writeText(`https://www.imdb.com/title/${movieInfo.imdbID}/`);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Opening IMDb",
                    message: "IMDb link copied to clipboard",
                  });
                }
              }}
            />
          </ActionPanel>
        }
      />
    );
  };

  if (showMovieDetail) {
    return <MovieDetail />;
  }

  const getFilterDescription = () => {
    const filters = [];
    if (selectedLanguage) {
      const selectedLang = languages.find((lang) => lang.code === selectedLanguage);
      filters.push(selectedLang?.name || selectedLanguage);
    }
    if (selectedQuality) {
      const selectedQual = qualities.find((qual) => qual.value === selectedQuality);
      filters.push(selectedQual?.name || selectedQuality);
    }
    return filters.length > 0 ? ` • ${filters.join(" • ")}` : "";
  };

  return (
    <List
      searchBarPlaceholder="Search for movies or TV shows (e.g., Inception, The Dark Knight)..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Language" value={selectedLanguage} onChange={setSelectedLanguage}>
          <List.Dropdown.Section title="Languages">
            <List.Dropdown.Item title="🌍 All Languages" value="" icon="🌍" />
            <List.Dropdown.Item title="🇸🇦 Arabic" value="ar" icon="🇸🇦" />
            <List.Dropdown.Item title="🇺🇸 English" value="en" icon="🇺🇸" />
            <List.Dropdown.Item title="🇫🇷 French" value="fr" icon="🇫🇷" />
            <List.Dropdown.Item title="🇪🇸 Spanish" value="es" icon="🇪🇸" />
            <List.Dropdown.Item title="🇩🇪 German" value="de" icon="🇩🇪" />
            <List.Dropdown.Item title="🇮🇹 Italian" value="it" icon="🇮🇹" />
            <List.Dropdown.Item title="🇵🇹 Portuguese" value="pt" icon="🇵🇹" />
            <List.Dropdown.Item title="🇷🇺 Russian" value="ru" icon="🇷🇺" />
            <List.Dropdown.Item title="🇯🇵 Japanese" value="ja" icon="🇯🇵" />
            <List.Dropdown.Item title="🇰🇷 Korean" value="ko" icon="🇰🇷" />
            <List.Dropdown.Item title="🇨🇳 Chinese" value="zh" icon="🇨🇳" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Quality Filter">
            <Action
              title={
                selectedQuality
                  ? `Quality: ${qualities.find((q) => q.value === selectedQuality)?.name}`
                  : "All Qualities"
              }
              icon={Icon.Filter}
              onAction={() => {}} // Will be handled by submenu
            />
            <ActionPanel.Submenu title="Select Quality" icon={Icon.Filter}>
              {qualities.map((quality) => (
                <Action
                  key={quality.value}
                  title={quality.name}
                  icon={selectedQuality === quality.value ? Icon.CheckCircle : Icon.Circle}
                  onAction={() => setSelectedQuality(quality.value)}
                />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
          {hasSearched && (
            <ActionPanel.Section title="Search Actions">
              <Action
                title="Clear All Filters"
                icon={Icon.Eraser}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => {
                  setSelectedLanguage("");
                  setSelectedQuality("");
                }}
              />
              <Action
                title="Refresh Search"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={handleRefresh}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >
      {/* Show smart suggestions while typing */}
      {searchText && searchText.length >= 2 && suggestions.length > 0 && !hasSearched && (
        <List.Section title="Suggestions">
          {suggestions.map((suggestion) => (
            <List.Item
              key={`suggestion-${suggestion}`}
              icon={Icon.MagnifyingGlass}
              title={suggestion}
              subtitle="Click to search for subtitles"
              actions={
                <ActionPanel>
                  <Action
                    title="Search for Subtitles"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => handleSuggestionClick(suggestion)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Show popular movies when no search has been performed */}
      {!hasSearched && !searchText && (
        <List.Section title="Popular Movies & TV Shows">
          {POPULAR_MOVIES.map((movie) => (
            <List.Item
              key={`popular-${movie}`}
              icon={Icon.Video}
              title={movie}
              subtitle="Click to search for subtitles"
              actions={
                <ActionPanel>
                  <Action
                    title="Search for Subtitles"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => handleSuggestionClick(movie)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Show movie info if available and has searched */}
      {hasSearched && movieInfo && (
        <List.Section title="Movie Information">
          <MovieInfoItem />
        </List.Section>
      )}

      {/* Show subtitles */}
      {hasSearched && filteredSubtitles.length > 0 && (
        <List.Section title={`Subtitles (${filteredSubtitles.length})${getFilterDescription()}`}>
          {filteredSubtitles.map((subtitle, index) => (
            <SubtitleItem key={`${subtitle.url}-${index}`} subtitle={subtitle} onRefresh={handleRefresh} />
          ))}
        </List.Section>
      )}

      {/* Show empty state when no results found */}
      {hasSearched && filteredSubtitles.length === 0 && !isLoading && searchText && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No subtitles found"
          description={`No subtitles found for "${searchText}". Try a different search term or adjust filters.`}
          actions={
            <ActionPanel>
              <Action
                title="Clear Filters"
                icon={Icon.Eraser}
                onAction={() => {
                  setSelectedLanguage("");
                  setSelectedQuality("");
                }}
              />
              <Action
                title="Try Popular Movies"
                icon={Icon.Video}
                onAction={() => {
                  setSearchText("");
                  setHasSearched(false);
                }}
              />
              <Action title="Refresh Search" icon={Icon.ArrowClockwise} onAction={handleRefresh} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
