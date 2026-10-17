import { useState } from "react";
import { Action, ActionPanel, Form } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { AiDetail } from "./components/AiDetail";

type FormValues = {
	question: string;
};

export default function Command() {
	const [question, setQuestion] = useState<string | null>(null);
	const { handleSubmit, itemProps } = useForm<FormValues>({
		onSubmit(values) {
			setQuestion(values.question.trim());
		},
		validation: {
			question: FormValidation.Required,
		},
	});

	if (!question) {
		return (
			<Form
				actions={
					<ActionPanel>
						<Action.SubmitForm title="Ask AI" onSubmit={handleSubmit} />
					</ActionPanel>
				}
			>
				<Form.TextArea
					{...itemProps.question}
					title="Your Question"
					placeholder="How do I handle errors in Effect-TS?"
					info="Ask anything about Effect-TS — concepts, APIs, patterns, etc."
				/>
			</Form>
		);
	}

	const prompt = `You are an expert in Effect-TS, a functional programming library for TypeScript. Assume the latest stable version of Effect-TS (v3) unless the question implies otherwise.

Answer in 2-4 short paragraphs. Use bullet points when comparing multiple options or listing steps. Always include a short TypeScript code example when the question involves APIs or patterns.

If you are uncertain about an API or behavior, say so and suggest checking the official documentation.

Question: ${question}`;

	return <AiDetail prompt={prompt} title={question} onAskAnother={() => setQuestion(null)} />;
}
