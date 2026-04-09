import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import axios from "axios";
import * as fs from "node:fs";

interface Preferences {
	rawNotesPath: string;
	obsidianPath: string;
	openaiApiKey: string;
	customPrompt: string;
}

export default async function main() {
	const preferences = getPreferenceValues<Preferences>();
	const url = "https://api.openai.com/v1/chat/completions";
	try {
		if (!fs.existsSync(preferences.rawNotesPath)) {
			await showToast(
				Toast.Style.Failure,
				"File Error",
				"Raw notes file not found at the specified path.",
			);
			return;
		}

		const rawContent = fs.readFileSync(preferences.rawNotesPath, "utf-8");

		if (!rawContent.trim()) {
			await showToast(
				Toast.Style.Failure,
				"Empty Note",
				"The raw notes file is empty. Write something first!",
			);
			return;
		}

		const toast = await showToast(
			Toast.Style.Animated,
			"ChatGPT is polishing...",
			"Processing your thoughts",
		);
		const response = await axios.post(
			url,
			{
				model: "gpt-5.4-nano",
				messages: [
					{ role: "system", content: preferences.customPrompt },
					{
						role: "user",
						content: `Raw note content:\n${rawContent}`,
					},
				],
				temperature: 0.3,
			},
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${preferences.openaiApiKey}`,
				},
			},
		);

		const polishedText = response.data.choices[0]?.message?.content;

		if (!polishedText) {
			throw new Error("OpenAI returned an empty response.");
		}

		const now = new Date();
		const dateHeader = now.toLocaleDateString("en-GB", {
			day: "numeric",
			month: "long",
			year: "numeric",
			weekday: "long",
		});

		const finalEntry = `\n\n---\n## ${dateHeader}\n\n${polishedText.trim()}\n`;

		fs.appendFileSync(preferences.obsidianPath, finalEntry);
		fs.writeFileSync(preferences.rawNotesPath, "");

		toast.style = Toast.Style.Success;
		toast.title = "Successfully Synced!";
		toast.message = "Note polished and archived.";
	} catch (error) {
		let errorMessage = "An unexpected error occurred";
		if (axios.isAxiosError(error)) {
			errorMessage =
				error.response?.data?.error?.message || error.message;
		} else if (error instanceof Error) {
			errorMessage = error.message;
		}
		await showToast(Toast.Style.Failure, "Critical Error", errorMessage);
	}
}
