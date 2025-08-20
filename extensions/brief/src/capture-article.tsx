import { Action, ActionPanel, Detail, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getCurrentURL, getPageTitle } from "./utils/browser";

interface Preferences {
	email: string;
	apiEndpoint: string;
	defaultAiSummary: boolean;
	summaryLength: "short" | "long";
}

export default function CaptureArticle() {
	const [url, setUrl] = useState<string>("");
	const [title, setTitle] = useState<string>("");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string>("");

	const preferences = getPreferenceValues<Preferences>();

	useEffect(() => {
		async function fetchCurrentPage() {
			try {
				const currentURL = await getCurrentURL();
				const pageTitle = await getPageTitle();

				setUrl(currentURL);
				setTitle(pageTitle);
				setIsLoading(false);
			} catch (error) {
				setError("Failed to get current page information");
				setIsLoading(false);
			}
		}

		fetchCurrentPage();
	}, []);

	async function sendToBrief(options: { aiSummary: boolean; summaryLength: "short" | "long"; context?: string }) {
		try {
			const toast = await showToast({
				style: Toast.Style.Animated,
				title: "Sending article...",
			});

			const site = new URL(url).hostname;

			const response = await fetch(preferences.apiEndpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					url,
					title,
					site,
					context: options.context || "",
					aiSummary: options.aiSummary,
					summaryLength: options.summaryLength,
					email: preferences.email,
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();

			if (result.success) {
				toast.style = Toast.Style.Success;
				toast.title = "Article sent successfully!";
				toast.message = `Sent to ${preferences.email}`;
			} else {
				throw new Error(result.error || "Unknown error occurred");
			}
		} catch (error) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to send article",
				message: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	if (isLoading) {
		return <Detail isLoading={true} markdown="Loading current page information..." />;
	}

	if (error) {
		return <Detail markdown={`# Error\n\n${error}`} />;
	}

	if (!url || !title) {
		return <Detail markdown="# No Active Page\n\nPlease open a webpage in your browser first." />;
	}

	const site = new URL(url).hostname;
	const markdown = `# ${title}

**URL:** ${url}  
**Site:** ${site}  
**Email:** ${preferences.email}  

Ready to capture and send this article with AI summary.`;

	return (
		<Detail
			markdown={markdown}
			actions={
				<ActionPanel>
					<Action
						title="Send with AI Summary"
						onAction={() =>
							sendToBrief({
								aiSummary: true,
								summaryLength: preferences.summaryLength,
							})
						}
					/>
					<Action
						title="Send Without AI Summary"
						onAction={() =>
							sendToBrief({
								aiSummary: false,
								summaryLength: preferences.summaryLength,
							})
						}
					/>
					<Action
						title="Send Short Summary"
						onAction={() =>
							sendToBrief({
								aiSummary: true,
								summaryLength: "short",
							})
						}
					/>
					<Action
						title="Send Long Summary"
						onAction={() =>
							sendToBrief({
								aiSummary: true,
								summaryLength: "long",
							})
						}
					/>
				</ActionPanel>
			}
		/>
	);
}
