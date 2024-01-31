const HOSTNAME = "idonthavespotify.donado.co";

export const API_URL = `https://${HOSTNAME}/api/search?v=1`;
export const SITE_URL = `https://${HOSTNAME}`;

export const SPOTIFY_LINK_REGEX =
  /^https:\/\/(open\.spotify\.com\/(track|album|playlist|artist|episode|show)|spotify\.link)\/(\w{11,24})(?:[?#].*)?$/;
