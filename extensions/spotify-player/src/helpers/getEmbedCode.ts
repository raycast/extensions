export function getEmbedCode(spotifyUrl?: string): string | undefined {
  if (!spotifyUrl) return undefined;
  const embedUrl = spotifyUrl.replace("open.spotify.com/", "open.spotify.com/embed/");
  return `<iframe style="border-radius:12px" src="${embedUrl}?utm_source=generator" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
}
