CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal` text NOT NULL,
	`duration` integer NOT NULL,
	`timestamp` integer NOT NULL
);
