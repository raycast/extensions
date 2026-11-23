/** Personal introduction and optional support links. Separate from the normative WCAG orientation. */
export const authorName = "Łukasz Krause";
export const authorBlogUrl = "https://catsandtests.blog/";
export const authorAuditUrl = "https://www.a11y-audit.eu/";
export const supportUrl = "https://buycoffee.to/a11yaudit";

export function aboutMeMarkdown(): string {
  return [
    "# About Me",
    "",
    "Hi, I'm **Łukasz Krause**. I'm a software tester working with manual and automated testing, especially accessibility testing for web and mobile apps.",
    "",
    "I created WCAG Testing Guide to make accessibility requirements easier to understand and test in everyday QA work.",
    "",
    "I also built [A11y Audit](https://www.a11y-audit.eu/), a free online tool that checks web pages with axe-core or Lighthouse and helps spot potential accessibility issues. Automated checks are a useful starting point, but they don't replace manual testing.",
    "",
    "On [Cats & Tests](https://catsandtests.blog/), I write about software testing, accessibility and technology.",
    "",
    "Outside work, I enjoy travelling on a budget and spending time with my cats, Kimci and Świerzbińka. I also volunteer with a group helping homeless cats find homes, mainly by managing its social media.",
    "",
    "## My projects",
    "",
    `- [A11y Audit](${authorAuditUrl}) — automated web accessibility checks`,
    `- [Cats & Tests](${authorBlogUrl}) — testing, accessibility and technology`,
    "",
    "## Support the guide",
    "",
    "WCAG Testing Guide is free. If you find it useful and would like to help with updates, you can [buy me a coffee](https://buycoffee.to/a11yaudit). There's no obligation, and all features will remain free.",
    "",
    "You can also open my projects or the support page from the **Actions** menu. Links only open when you choose them.",
  ].join("\n");
}
