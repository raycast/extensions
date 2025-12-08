export async function getITunesArtwork(term: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      term,
      media: "music",
      entity: "album",
      limit: "1",
    });

    const response = await fetch(
      `https://itunes.apple.com/search?${params.toString()}`,
    );
    if (!response.ok) return null;

    const data = (await response.json()) as {
      results: { artworkUrl100: string }[];
    };
    if (data.results.length === 0) return null;

    // Get higher resolution image (600x600)
    return data.results[0].artworkUrl100.replace("100x100", "600x600");
  } catch (error) {
    console.error("Error fetching iTunes artwork:", error);
    return null;
  }
}
