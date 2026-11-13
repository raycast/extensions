CREATE TABLE threads (
  id TEXT PRIMARY KEY,
  rollout_path TEXT NOT NULL,
  created_at INTEGER,
  updated_at INTEGER,
  source TEXT,
  thread_source TEXT,
  cwd TEXT,
  title TEXT,
  first_user_message TEXT,
  preview TEXT,
  archived INTEGER,
  git_branch TEXT,
  git_origin_url TEXT,
  model TEXT,
  tokens_used INTEGER
);
