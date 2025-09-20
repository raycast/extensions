// User Account
export const USER_GET = `/user`;
export const TRAFFIC_GET = `/traffic`;

// Downloads
export const DOWNLOADS_GET = `/downloads`;
export const DOWNLOAD_DELETE = (download_id: string) => `/downloads/delete/${download_id}`;
export const DOWNLOAD_GET_STREAMING_INFO = (download_id: string) => `/streaming/mediaInfos/${download_id}`;

// Torrents
export const TORRENTS_GET = `/torrents`;
export const TORRENT_ADD_FILE = `/torrents/addTorrent`;
export const TORRENT_ADD_MAGNET = `/torrents/addMagnet`;
export const TORRENT_GET_STATUS = (torrent_id: string) => `/torrents/info/${torrent_id}`;
export const TORRENT_SELECT_FILES = (torrent_id: string) => `/torrents/selectFiles/${torrent_id}`;
export const TORRENT_DELETE = (torrent_id: string) => `/torrents/delete/${torrent_id}`;

// Unrestrict
export const UNRESTRICT_LINK = `/unrestrict/link`;
