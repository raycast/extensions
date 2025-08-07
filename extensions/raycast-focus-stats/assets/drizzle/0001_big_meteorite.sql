CREATE UNIQUE INDEX `sessions_timestamp_unique` ON `sessions` (`timestamp`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_goal_timestamp_unique` ON `sessions` (`goal`,`timestamp`);