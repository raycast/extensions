const API_HOST = 'https://api.neynar.com/v2';
export const ApiUrls = {
  getPowerUsers(cursor?: string) {
    return `${API_HOST}/farcaster/user/power?limit=100` + `${cursor ? `&cursor=${cursor}` : ''}`;
  },
  getProfilesByUsername(query: string, cursor?: string) {
    return (
      `${API_HOST}/farcaster/user/search?q=${query}&viewer_fid=3&limit=10` + `${cursor ? `&cursor=${cursor}` : ''}`
    );
  },
  getUserFids(fid: string, cursor?: string) {
    return `${API_HOST}/farcaster/user/bulk?fids=${fid}` + `${cursor ? `&cursor=${cursor}` : ''}`;
  },
  getTrendingCasts(timeWindow: string, cursor?: string) {
    return (
      `${API_HOST}/farcaster/feed/trending?limit=10` +
      `&time_window=${timeWindow}` +
      `${cursor ? `&cursor=${cursor}` : ''}`
    );
  },
};
