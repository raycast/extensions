export interface TVCSymbolArg {
	symbol: string;
}

export interface TVCIntervalArg {
	/** Time interval, denoted in minutes */
	interval: string;
}

export interface TVCTakeChartScreenshotArgs extends TVCSymbolArg, Partial<TVCIntervalArg> {}
export interface TVCChangeChartIntervalArgs extends TVCIntervalArg {}
export interface TVCPreferences {
	/** Time interval, denoted in minutes */
	interval?: string;

	/** Chart symbol */
	symbol?: string;
}
