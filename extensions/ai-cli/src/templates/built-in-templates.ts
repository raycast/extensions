import type { PromptTemplate } from "@/types/prompt-template";
import { createPromptTemplate } from "../templates/prompt-builder";

/**
 * Slack template for casual, engaging communication with emoji support
 */
export const SLACK_TEMPLATE: PromptTemplate = createPromptTemplate(
  "slack",
  "Slack",
  {
    instructions: `You are helping format the following text for Slack communication.`,
    requirements: `- Break up longer text into digestible chunks
- Include relevant emojis but keep them purposeful and professional (but don't overdo it)
- Use formatting like *bold* and _italics_ when helpful but only when appropriate`,
    output: `Output only the formatted text as Slack message ready to send`,
  },
  undefined,
  true
);

/**
 * Code Review template for technical feedback and pull request descriptions
 */
export const CODE_REVIEW_TEMPLATE: PromptTemplate = createPromptTemplate(
  "code-review",
  "Code Review",
  {
    instructions: `You are helping format text for pull requests, code reviews, and technical feedback across platforms.
Create clear, technical communication that follows development best practices.
Focus on clarity, completeness, and technical accuracy.`,

    requirements: `- Use proper markdown formatting for structure
- Include code blocks with syntax highlighting when relevant
- Be specific and technical when describing changes
- Follow conventional PR description patterns
- Include relevant technical details and rationale
- Work across GitHub, GitLab, Bitbucket, and other platforms`,

    output: `Format text as a complete markdown document ready for pull requests or code reviews.
Use standard markdown syntax including:
- Headers (##, ###) for organization
- Code blocks with language specification
- Lists for requirements or steps
- Links to relevant issues or documentation
- Technical terminology appropriate for the development context`,
  },
  undefined,
  true
);

/**
 * Email template for professional business communication
 */
export const EMAIL_TEMPLATE: PromptTemplate = createPromptTemplate(
  "email",
  "Email",
  {
    instructions: `Format the following text as a professional business email.`,
    requirements: `- Use proper email structure with clear subject integration
- Include appropriate salutations and closings based on context
- Maintain professional, courteous tone throughout
- Structure information clearly with proper paragraphs
- End with appropriate call-to-action when needed`,
    output: `Output as a complete email ready to send, including suggested subject line if context allows.`,
  },
  undefined,
  true
);

/**
 * Bug Report template for structured problem descriptions
 */
export const BUG_REPORT_TEMPLATE: PromptTemplate = createPromptTemplate(
  "bug-report",
  "Bug Report",
  {
    instructions: `Structure the following information as a comprehensive bug report for issue tracking.`,
    requirements: `- Clear problem description and impact
- Steps to reproduce the issue when possible
- Expected vs actual behavior comparison
- Environment details when relevant (browser, OS, versions)
- Include relevant error messages or logs
- Suggest severity/priority level when appropriate`,
    output: `Format as a structured bug report ready for issue tracking systems like Jira, GitHub Issues, or Linear.`,
  },
  undefined,
  true
);

/**
 * Technical Documentation template for professional technical docs
 */
export const TECHNICAL_DOCS_TEMPLATE: PromptTemplate = createPromptTemplate(
  "technical-docs",
  "Technical Documentation",
  {
    instructions: `Convert the following explanation into professional technical documentation.`,
    requirements: `- Use clear headings and logical structure
- Include code examples with proper formatting when relevant
- Explain concepts clearly without losing technical accuracy
- Add context for different skill levels when appropriate
- Use consistent terminology throughout
- Include implementation details and best practices`,
    output: `Format as professional technical documentation with proper Markdown structure.`,
  },
  undefined,
  true
);

/**
 * None template placeholder for user-defined templates
 */
export const CUSTOM_TEMPLATE: PromptTemplate = createPromptTemplate(
  "custom",
  "None",
  {
    instructions: ``,
    requirements: ``,
    output: "",
  },
  undefined,
  true
);

/**
 * Collection of all built-in templates
 */
export const BUILT_IN_TEMPLATES: Record<string, PromptTemplate> = {
  custom: CUSTOM_TEMPLATE,
  slack: SLACK_TEMPLATE,
  "code-review": CODE_REVIEW_TEMPLATE,
  email: EMAIL_TEMPLATE,
  "bug-report": BUG_REPORT_TEMPLATE,
  "technical-docs": TECHNICAL_DOCS_TEMPLATE,
} as const;

/**
 * Get a built-in template by ID
 */
export function getBuiltInTemplate(id: string): PromptTemplate | undefined {
  return BUILT_IN_TEMPLATES[id];
}

/**
 * Get all built-in template IDs
 */
export function getBuiltInTemplateIds(): string[] {
  return Object.keys(BUILT_IN_TEMPLATES);
}

/**
 * Check if a template ID is built-in
 */
export function isBuiltInTemplate(id: string): boolean {
  return id in BUILT_IN_TEMPLATES;
}

/**
 * Get all built-in templates as an array
 */
export function getAllBuiltInTemplates(): PromptTemplate[] {
  return Object.values(BUILT_IN_TEMPLATES);
}
