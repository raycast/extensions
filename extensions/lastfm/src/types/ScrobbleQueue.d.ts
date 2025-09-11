export interface QueuedScrobble {
  id: string; // unique identifier for the scrobble
  track: {
    name: string;
    artist: string;
    album?: string;
    duration?: number;
    mbid?: string;
  };
  timestamp: number; // when the track was played
  attempts: number; // how many times we've tried to scrobble this
  lastAttempt?: number; // timestamp of last attempt
  error?: string; // last error message if any
}

export interface ScrobbleQueueState {
  queue: QueuedScrobble[];
  processing: boolean;
  lastProcessed?: number;
}

export interface ScrobbleResult {
  success: boolean;
  accepted?: number;
  ignored?: number;
  error?: string;
  failedScrobbles?: QueuedScrobble[];
}
