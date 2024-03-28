const API_HOST = 'https://api.neynar.com/v2';
export const ApiUrls = {
  getUsers(cursor?: string) {
    return `${API_HOST}/farcaster/user/power` + `${cursor ? `&cursor=${cursor}` : ''}`;
  },
  getUserFids(fid: string, cursor?: string) {
    return `${API_HOST}/farcaster/user/bulk?fids=${fid}` + `${cursor ? `&cursor=${cursor}` : ''}`;
  },
  getTrendingCasts(timeRangeInHours?: number, cursor?: string) {
    return (
      `${API_HOST}/farcaster/feed/trending?limit=10` +
      `${timeRangeInHours ? `&time_window=${timeRangeInHours}h` : '&time_window=1h'}` +
      `${cursor ? `&cursor=${cursor}` : ''}`
    );
  },
};
