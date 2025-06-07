import { textEditCommand } from "./internal/textEditCommand";

export default async function Command() {
  return textEditCommand({
    prompt: `You will act as an EXPERT editor.

### INSTRUCTIONS ###
FOLLOW these INSTRUCTIONS carefully for translating the text:
1. READ the provided text in the user's message.
2. Fix the text if it is not correct.
3. Return your answer as a JSON object with one field:
   - "result": the fixed text

###EXAMPLE 1###
User message:
Hi tis is a mesage with \`markdown\` and <b>tegs</b>
Your answer:
Hi, this is a message with \`markdown\` and <b>tags</b>

###EXAMPLE 2###
User message:
Привит это саобщение с \`markdown\`, и <b>тегими</b>
Your answer:
Привет, это сообщение с \`markdown\` и <b>тегами</b>
`,
    options: { temperature: 0.1 },
    hudMessage: "Fixing text...",
    successMessage: "Text fixed and copied to clipboard",
    errorMessage: "Cannot fix text",
  });
}
