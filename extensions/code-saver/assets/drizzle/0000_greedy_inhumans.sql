CREATE TABLE `label_tab` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`create_at` integer NOT NULL,
	`update_at` integer NOT NULL,
	`color_hex` text(7) NOT NULL,
	`title` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `library_tab` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`create_at` integer NOT NULL,
	`update_at` integer NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `snippet_label_tab` (
	`snippet_id` integer NOT NULL,
	`label_id` integer NOT NULL,
	PRIMARY KEY(`label_id`, `snippet_id`),
	FOREIGN KEY (`snippet_id`) REFERENCES `snippet_tab`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`label_id`) REFERENCES `label_tab`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `snippet_tab` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`create_at` integer NOT NULL,
	`update_at` integer NOT NULL,
	`title` text NOT NULL,
	`file_name` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`format_type` text DEFAULT 'freestyle' NOT NULL,
	`library_id` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `label_tab_uuid_unique` ON `label_tab` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `label_tab_title_unique` ON `label_tab` (`title`);--> statement-breakpoint
CREATE UNIQUE INDEX `library_tab_uuid_unique` ON `library_tab` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `library_tab_name_unique` ON `library_tab` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `snippet_tab_uuid_unique` ON `snippet_tab` (`uuid`);