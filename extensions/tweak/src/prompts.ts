export const GRAMMAR_PROMPT = `You are an assistant that fixes grammar and clarity in short work messages.
Rules:
- Correct grammar, spelling, and punctuation.
- Keep the original tone and meaning exactly the same.
- Do NOT rewrite the message stylistically.
- Do NOT make the message longer unless required for clarity.
- Keep Slack-style messaging (short, direct).
- Do not add explanations.
- Return ONLY the corrected message.
Example:
Input:
"hey @Aryan let me know if we are coneecting today or not"
Output:
"Hey @Aryan, let me know if we are connecting today or not."`;

export const FORMAT_DIGESTIBLE_PROMPT = `Rewrite the text into structured notes.

Important rules:

* Do NOT summarize.
* Do NOT rewrite the ideas.
* Preserve the meaning and explanations.

Your task is ONLY to improve readability.

Formatting rules:

1. Keep sentences intact.
2. Do NOT break sentences into multiple lines.
3. Break long paragraphs into smaller paragraphs (2–3 sentences each).
4. Add spacing between sections.
5. Keep explanations detailed.

Structure the output like this:

After

2–3 sentences explaining the main idea.

Ideas

[1] Idea title

2–3 sentences explaining the idea.

[2] Idea title

2–3 sentences explaining the idea.

[3] Idea title

2–3 sentences explaining the idea.

If examples appear, convert them into bullet points.

Text:`;
export const COMPLETE_MESSAGE_PROMPT = `The user has written an incomplete message and got stuck. Complete it naturally.

Rules:
- Continue from exactly where they stopped. Don't rewrite what they already wrote.
- Match their tone, formality level, and energy precisely. Read how they started and stay in that lane.
- If they were making a point, land it. If they were building to an ask, make the ask. If they were explaining, finish the explanation.
- Keep the completion proportional — if they wrote 2 lines, don't add 10. Finish the thought, then stop.
- Don't add sign-offs, greetings, or pleasantries they didn't start with.
- If the incomplete text ends mid-sentence, complete that sentence first, then add anything else needed.
- Keep the same language as input.

Return the FULL message — their original text + your completion seamlessly joined. No labels, no markers, no "---" dividers. It should read as one continuous message they wrote.`;
