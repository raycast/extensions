export async function getDeezerArtwork(term: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      q: term,
      limit: "1",
    });

    const response = await fetch(
      `https://api.deezer.com/search/track?${params.toString()}`,
    );
    if (!response.ok) return null;

    const data = (await response.json()) as {
      data: { album: { cover_xl: string } }[];
    };
    if (!data.data || data.data.length === 0) return null;

    return data.data[0].album.cover_xl;
  } catch (error) {
    console.error("Error fetching Deezer artwork:", error);
    return null;
  }
}
