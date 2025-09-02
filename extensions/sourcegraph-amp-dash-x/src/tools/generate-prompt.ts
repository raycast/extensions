export type Input = {
  /**
   * What do you want to do? e.g. "refactor", "write tests", "add docs", "optimize performance".
   * The tool picks the right template based on this purpose.
   */
  purpose: string;
  /** Primary language or stack context, e.g. "TypeScript", "React", "Go" */
  language?: string;
  /** Scope of work to hint the agent. */
  scope?: "selection" | "file" | "module" | "project";
  /** How bold should the change be. */
  intensity?: "conservative" | "moderate" | "aggressive";
  /** Extra constraints or acceptance criteria, one per item. */
  constraints?: string[];
  /** Any additional hints or context to weave into the prompt. */
  context?: string;
};

/**
 * Generate a high-quality Amp prompt for a given software task.
 * Returns a Markdown block containing the suggested prompt.
 */
export default async function tool(input: Input) {
  const purpose = (input.purpose || "").trim().toLowerCase();
  if (!purpose)
    return 'Error: `purpose` is required. Example: purpose: "refactor"';

  const lang = (input.language || "").trim();
  const scope = input.scope || "selection";
  const intensity = input.intensity || "moderate";
  const extra = Array.isArray(input.constraints)
    ? input.constraints.filter(Boolean)
    : [];
  const ctx = (input.context || "").trim();

  const sections: string[] = [];

  sections.push(`# Generated Amp Prompt`);
  sections.push("");
  sections.push(promptTitle(purpose, lang));
  sections.push("");
  sections.push("Context:");
  sections.push("- Scope: " + scope);
  if (lang) sections.push("- Language/Stack: " + lang);
  sections.push("- Change Intensity: " + intensity);
  if (ctx) sections.push("- Notes: " + ctx);
  sections.push("");
  sections.push("Prompt:");
  sections.push("```");
  sections.push(buildPrompt(purpose, { lang, scope, intensity, extra, ctx }));
  sections.push("```");
  sections.push("");
  sections.push(
    "Tip: Use the run-prompt tool to build a ready `amp -x` command once you adjust this text.",
  );

  return sections.join("\n");
}

function promptTitle(purpose: string, lang: string): string {
  const nice = capitalize(purpose);
  const stack = lang ? ` (${lang})` : "";
  return `## ${nice} Prompt${stack}`;
}

function buildPrompt(
  purpose: string,
  opts: {
    lang: string;
    scope: string;
    intensity: "conservative" | "moderate" | "aggressive";
    extra: string[];
    ctx: string;
  },
): string {
  const header = baseHeader(purpose, opts);
  const body =
    purpose.includes("refactor") || purpose.includes("cleanup")
      ? refactorBody(opts)
      : purpose.includes("test") || purpose.includes("unit test")
        ? testsBody(opts)
        : purpose.includes("doc") || purpose.includes("readme")
          ? docsBody(opts)
          : purpose.includes("perf") || purpose.includes("optimize")
            ? perfBody(opts)
            : genericBody(opts);

  const acceptance = acceptanceCriteria(opts);
  const extras = opts.extra.length
    ? "\nAdditional Constraints:\n" + opts.extra.map((e) => `- ${e}`).join("\n")
    : "";

  return [header, body, acceptance, extras].filter(Boolean).join("\n\n");
}

function baseHeader(
  purpose: string,
  {
    lang,
    scope,
    intensity,
    ctx,
  }: {
    lang: string;
    scope: string;
    intensity: Input["intensity"];
    ctx: string;
  },
): string {
  return [
    `Task: ${capitalize(purpose)}`,
    `Scope: ${scope}`,
    lang ? `Language/Stack: ${lang}` : "",
    `Change Intensity: ${intensity}`,
    ctx ? `Notes: ${ctx}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function refactorBody({
  lang,
  scope,
}: {
  lang: string;
  scope: string;
}): string {
  const guidelines = [
    "Preserve external behavior and public APIs",
    "Improve readability, maintainability, and cohesion",
    "Eliminate dead code and duplicate logic",
    "Prefer pure functions and smaller modules when reasonable",
    "Keep diffs minimal and focused; avoid broad rewrites unless required",
  ];
  const langLine = lang ? ` in ${lang}` : "";
  return [
    `Refactor the ${scope}${langLine}. Apply the following guidelines:`,
    ...guidelines.map((g) => `- ${g}`),
    "Include a brief rationale for non-trivial changes.",
  ].join("\n");
}

function testsBody({ lang, scope }: { lang: string; scope: string }): string {
  const langLine = lang ? ` in ${lang}` : "";
  return [
    `Create or improve automated tests for the ${scope}${langLine}.`,
    "- Prefer fast, deterministic unit tests",
    "- Cover edge cases and error paths",
    "- Add meaningful test descriptions and arrange/act/assert structure",
  ].join("\n");
}

function docsBody({ lang, scope }: { lang: string; scope: string }): string {
  const langLine = lang ? ` for ${lang}` : "";
  return [
    `Write or update documentation for the ${scope}${langLine}.`,
    "- Clarify purpose, inputs/outputs, and side-effects",
    "- Include examples and common pitfalls",
    "- Keep tone concise and practical",
  ].join("\n");
}

function perfBody({ lang, scope }: { lang: string; scope: string }): string {
  const langLine = lang ? ` in ${lang}` : "";
  return [
    `Optimize performance of the ${scope}${langLine}.`,
    "- Identify hotspots and reduce algorithmic complexity where possible",
    "- Minimize allocations and unnecessary work",
    "- Avoid premature micro-optimizations; prioritize high-impact wins",
    "- Provide before/after benchmarks if possible",
  ].join("\n");
}

function genericBody({ lang, scope }: { lang: string; scope: string }): string {
  const langLine = lang ? ` in ${lang}` : "";
  return [
    `Perform the requested work on the ${scope}${langLine}.`,
    "- Explain decisions briefly",
    "- Keep changes minimal and reversible",
  ].join("\n");
}

function acceptanceCriteria({ scope }: { scope: string }): string {
  return [
    "Acceptance Criteria:",
    "- All existing tests pass",
    `- No changes to expected behavior for ${scope} unless explicitly stated`,
    "- Code is idiomatic for the stack and passes linters",
  ].join("\n");
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
