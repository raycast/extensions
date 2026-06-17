import { Tool, environment, open } from "@raycast/api";
import fs from "fs";

type Input = {
  /**
   * The title of the website
   */
  title: string;
  /**
   * A camelCase title of the website that can be used as a file
   */
  filename: string;
  /**
   * A brief description of the website
   */
  about: string;
  /**
   * This code will go into the Body of your HTML page. It should not contain any html, head or tags that go outside of Body. This code should use TailwindCSS and DaisyUI for styling.
   */
  html: string;
  /**
   * This JS code will be included in your website, after your HTML code. Write anything that is needed to make the app work.
   */
  js: string;
};

const createHTML = (input: Input) => `<!DOCTYPE html>

<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>${input.title}</title>
    <meta name="description" content="${input.about}">
		<link
			href="https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css"
			rel="stylesheet"
		/>
		<link
			href="https://cdn.jsdelivr.net/npm/daisyui@latest/dist/full.css"
			rel="stylesheet"
		/>
	</head>

	<body>
    ${input.html}

		<script async defer>
			${input.js}
		</script>
	</body>
</html>`;

export default async function (input: Input) {
  console.log(input);
  fs.writeFileSync(`${environment.supportPath}/${input.filename}.html`, createHTML(input));
  open(`${environment.supportPath}/${input.filename}.html`);
  return `\`${environment.supportPath}/${input.filename}.html\` has been created.`;
}

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  return {
    message: `Create this app in \`${environment.supportPath}/${input.filename}.html\`?\n\`\`\`\n${createHTML(input)}\n\`\`\``,
  };
};
