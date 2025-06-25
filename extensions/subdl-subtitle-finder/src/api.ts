const BASE_URL = "https://api.subdl.com/api/v1";

export interface Subtitle {
  release_name: string;
  name: string;
  lang: string;
  author: string;
  url: string;
  SubEncoding?: string;
  SubFormat?: string;
  SubSize?: string;
  SubHash?: string;
  SubRating?: string;
  SubDownloadsCnt?: string;
  SubHearingImpaired?: string;
  UserID?: string;
  SubtitlesLink?: string;
  SubAddDate?: string;
  SubComments?: string;
  SubFeatured?: string;
  SubHD?: string;
  SubTranslator?: string;
  // Additional fields that might be present
  [key: string]: string | number | boolean | undefined;
}

export interface SubtitleDetail {
  id: string;
  filename: string;
  download_url: string;
  size: string;
}

export interface SearchResponse {
  status: boolean;
  results: Array<{
    imdb_id: string;
    tmdb_id: number;
    type: string;
    name: string;
    sd_id: number;
    first_air_date?: string;
    year: number | null;
    slug: string;
  }>;
  subtitles: Subtitle[];
  error?: string;
}

class SubDLAPI {
  async searchSubtitles(query: string, apiKey: string, language?: string, quality?: string): Promise<SearchResponse> {
    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        film_name: query,
        subs_per_page: "30", // Increased to maximum allowed
      });

      if (language) {
        params.append("languages", language);
      }

      const url = `${BASE_URL}/subtitles?${params.toString()}`;
      console.log("API Request URL:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Raycast SubDL Extension",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid API key. Please check your SubDL API key in preferences.");
        } else if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait a moment before searching again.");
        } else if (response.status === 404) {
          throw new Error("SubDL API endpoint not found. Please check if the service is available.");
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const data = await response.json();
      console.log("API Response:", data);

      if (!data.status) {
        if (data.error) {
          if (data.error.toLowerCase().includes("can't find movie")) {
            throw new Error("can't find movie or tv");
          } else if (data.error.toLowerCase().includes("api key")) {
            throw new Error("Invalid API key. Please check your SubDL API key in preferences.");
          } else {
            throw new Error(data.error);
          }
        } else {
          throw new Error("Search failed - no results found");
        }
      }

      let filteredSubtitles = data.subtitles || [];

      // Apply quality filter if specified
      if (quality && quality !== "") {
        filteredSubtitles = filteredSubtitles.filter((subtitle: Subtitle) => {
          const releaseName = subtitle.release_name?.toLowerCase() || "";
          const qualityLower = quality.toLowerCase();

          // Check for quality in release name
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

          return true;
        });
      }

      return {
        status: data.status,
        results: data.results || [],
        subtitles: filteredSubtitles,
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error("SubDL API Error:", error.message);
        throw error;
      } else {
        console.error("Unknown error:", error);
        throw new Error("Unknown error occurred while searching");
      }
    }
  }

  async getSubtitleDetail(subtitleUrl: string): Promise<SubtitleDetail> {
    // Extract the download URL from the subtitle URL
    // The URL format from API is like: "/subtitle/3467330-839038.zip"
    const downloadUrl = `https://dl.subdl.com${subtitleUrl}`;

    // Extract filename from URL
    const urlParts = subtitleUrl.split("/");
    const filename = urlParts[urlParts.length - 1] || "subtitle.zip";

    return {
      id: subtitleUrl,
      filename: filename,
      download_url: downloadUrl,
      size: "Unknown",
    };
  }

  async downloadSubtitle(downloadUrl: string): Promise<ArrayBuffer> {
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    return await response.arrayBuffer();
  }
}

export const subdlAPI = new SubDLAPI();
