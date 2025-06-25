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
    { value: "1080p", name: "1080p" },
    { value: "720p", name: "720p" },
    { value: "480p", name: "480p" },
    { value: "360p", name: "360p" },
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

    return (
      <List.Item
        key="movie-info"
        icon={Icon.Video}
        title={movieInfo.Title}
        subtitle={`${movieInfo.Year} • ${movieInfo.Runtime} • ${movieInfo.Genre}`}
        accessories={[
          { icon: Icon.Star, text: movieInfo.imdbRating },
          { icon: Icon.Person, text: movieInfo.Director },
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action title="View Movie Details" icon={Icon.Info} onAction={() => setShowMovieDetail(true)} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  const MovieDetail = () => {
    if (!movieInfo) return null;

    return (
      <Detail
        markdown={`# ${movieInfo.Title} (${movieInfo.Year})

${movieInfo.Poster && movieInfo.Poster !== "N/A" ? `![Poster](${movieInfo.Poster})` : ""}

**Plot:** ${movieInfo.Plot}

**Director:** ${movieInfo.Director}
**Writers:** ${movieInfo.Writer}
**Actors:** ${movieInfo.Actors}

**Genre:** ${movieInfo.Genre}
**Runtime:** ${movieInfo.Runtime}
**Rating:** ${movieInfo.Rated}
**Release Date:** ${movieInfo.Released}

**IMDb Rating:** ${movieInfo.imdbRating}/10 (${movieInfo.imdbVotes} votes)
**Metascore:** ${movieInfo.Metascore}

${movieInfo.Ratings?.map((rating) => `**${rating.Source}:** ${rating.Value}`).join("\n") || ""}
        `}
        actions={
          <ActionPanel>
            <Action title="Back to Search" icon={Icon.ArrowLeft} onAction={() => setShowMovieDetail(false)} />
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
        <List.Dropdown
          tooltip="Filter by Language & Quality"
          value={`${selectedLanguage}|${selectedQuality}`}
          onChange={(value) => {
            const [language, quality] = value.split("|");
            setSelectedLanguage(language);
            setSelectedQuality(quality);
          }}
        >
          <List.Dropdown.Section title="Language & Quality Combinations">
            <List.Dropdown.Item title="All Languages & Qualities" value="|" />

            {/* All Languages with Quality Filters */}
            <List.Dropdown.Item title="All Languages • 4K/2160p" value="|4k" />
            <List.Dropdown.Item title="All Languages • 1080p" value="|1080p" />
            <List.Dropdown.Item title="All Languages • 720p" value="|720p" />
            <List.Dropdown.Item title="All Languages • 480p" value="|480p" />
            <List.Dropdown.Item title="All Languages • 360p" value="|360p" />
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Language Filters">
            {languages.map((lang) => (
              <List.Dropdown.Item
                key={`${lang.code}-all`}
                title={`${lang.name} • All Qualities`}
                value={`${lang.code}|`}
              />
            ))}
          </List.Dropdown.Section>

          {/* Arabic with all quality options */}
          <List.Dropdown.Section title="Arabic Subtitles">
            {qualities.slice(1).map((quality) => (
              <List.Dropdown.Item
                key={`ar-${quality.value}`}
                title={`Arabic • ${quality.name}`}
                value={`ar|${quality.value}`}
              />
            ))}
          </List.Dropdown.Section>

          {/* English with all quality options */}
          <List.Dropdown.Section title="English Subtitles">
            {qualities.slice(1).map((quality) => (
              <List.Dropdown.Item
                key={`en-${quality.value}`}
                title={`English • ${quality.name}`}
                value={`en|${quality.value}`}
              />
            ))}
          </List.Dropdown.Section>

          {/* Other languages with quality options */}
          {languages.slice(2).map((lang) => (
            <List.Dropdown.Section key={lang.code} title={`${lang.name} Subtitles`}>
              {qualities.slice(1).map((quality) => (
                <List.Dropdown.Item
                  key={`${lang.code}-${quality.value}`}
                  title={`${lang.name} • ${quality.name}`}
                  value={`${lang.code}|${quality.value}`}
                />
              ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
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
