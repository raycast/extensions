-- Database layout and migration history produced by Drizzle 0.43.1.
-- Keep this independent of the current migrations to test existing-user upgrades.
CREATE TABLE sessions (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  goal text NOT NULL,
  duration integer NOT NULL,
  timestamp integer NOT NULL
);
CREATE UNIQUE INDEX sessions_timestamp_unique ON sessions (timestamp);
CREATE UNIQUE INDEX sessions_goal_timestamp_unique ON sessions (goal, timestamp);

-- SQLite allows NULL ids with this historical SERIAL PRIMARY KEY declaration.
CREATE TABLE __drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at numeric
);
INSERT INTO __drizzle_migrations (hash, created_at) VALUES
  ('e4504952554247ef8bc26e6805cc1901947a7224cb934b947c51fc63ff18b965', 1747519970749),
  ('cabae47f7dd417363c5b3ef0453da55cd7866ada2533095e383213fd1f0b8e84', 1752844591926);

INSERT INTO sessions (goal, duration, timestamp) VALUES
  ('Writing', 25, 1793088000000),
  ('Writing', 15, 1793091600000),
  ('Review', 20, 1793095200000);
