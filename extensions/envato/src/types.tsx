
export interface envatoErrors {
	empty?: boolean;
	reason?: string;
	description?: string;
};

export interface  envatoUser {
	username?: string;
	sales?: string;
	image?: string;
};

export interface saleItem {
	item?: saleItemMeta;
	amount?: any;
	support_amount?: any;
	previews?: previewsItem;
	detail?: [];
	type?: String;
	name?: String;
	wordpress_theme_metadata?: wpThemeMetadata;
	sold_at?: Date;
	supported_until?: Date;
	price_cents?: any;
	license?: String;
	number_of_sales?: String;
	author_username?: String;
	author_url?: String;
	rating_count?: Number;
	rating?: saleRating;
	published_at?: Date;
	updated_at?: Date;
	id?: Number;
	version?: Number;
	theme_name?: String;
	author_name?: String;
	description?: String;
	url?: [];
	date?: Date;
};

export interface  saleItemMeta {
	wordpress_theme_metadata?: wpThemeMetadata;
	url?: [];
	name?: string;
	number_of_sales?: String;
	author_username?: String;
	author_url?: String;
	rating_count?: Number;
	rating?: saleRating;
};

export interface  saleRating {
	rating?: Number;
	count?: Number;
}

export interface  wpThemeMetadata {
	theme_name?: string;
	name?: String;
	author_name?: string;
	author_username?: String;
	version?: string;
	description?: string;
};

export interface  previewsItem { 
	icon_with_landscape_preview?: String;
};
