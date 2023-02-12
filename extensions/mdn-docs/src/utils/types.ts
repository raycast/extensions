export type MDNResult = {
	mdn_url: string;
	score: number;
	title: string;
	popularity: number;
	slug: string;
	summary: string;
	highlight: { body: string[]; title: [] };
};

export type Preferences = {
	rememberSearchHistory: boolean;
	maxSearchHistory: string;
};
