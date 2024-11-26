import dedent from "dedent";
import { RequestFormValues } from "../request";

export const generateIssueURL = (form: RequestFormValues) => {
  const title = `🔔 [Request]: Add ${form.iconName} icon`;
  const body = dedent`
    ## 🔎 Information:

    - **Title**: ${form.iconName}
    - **Category**: ${form.category}
    - **Source (.svg)**: ${form.sourceUrl}
    - **Website**: ${form.iconWebsiteUrl}

    ## 📝 Checklist:

    - [${form.permissionCheck ? "x" : " "}] I have permission to use this logo.
    - [${form.optimizedCheck ? "x" : " "}] The link I have provided is optimized for web use.
    - [${form.sizeCheck ? "x" : " "}] The size of the SVG is less than **20kb**.
    `;

  const encodedTitle = encodeURIComponent(title);
  const encodedBody = encodeURIComponent(body);

  return `https://github.com/pheralb/svgl/issues/new?assignees=pheralb&labels=request&title=${encodedTitle}&body=${encodedBody}`;
};
