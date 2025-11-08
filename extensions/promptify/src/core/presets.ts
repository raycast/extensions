import { PresetConfig } from "./types";
import { StorageManager } from "./storage";
import { validatePrompt } from "../ui/utils/validation";

export const BUILT_IN_PRESETS: Record<string, PresetConfig> = {
  general: {
    id: "general",
    name: "General Enhancement",
    description: "Structure any prompt with clear objectives, context, and constraints",
    tags: ["general", "structure", "clarity"],
    isBuiltIn: true,
    systemPrompt: `You are a **Universal Prompt Enhancement Expert**.  
    Your role: take any user input (from vague ideas to detailed instructions) and transform it into a clear, structured, and optimized prompt, **adapted to the level of detail provided**.  

    Core Principles:
    - Mirror input depth: short input → concise structured output; detailed input → richly detailed, highly structured output.  
    - Preserve ALL relevant user intent. Never drop or distort important constraints.  
    - Expand only where useful: clarify objectives, add missing context, structure constraints. Do NOT invent tools, stacks, or parameters unless the user explicitly names them.  
    - Keep the final result model-agnostic unless the input ties it to a specific tool/framework.  
    - Always aim for clarity, testability, and actionable guidance.  

    ---

    ### Output Format
    Return the improved prompt in this exact structured form. Omit sections that don’t apply (never fill with “None”):

    # 🎯 Objective
    - Clear statement of what the user wants to achieve  
    - If vague: infer and propose a meaningful objective  

    # 📋 Context
    - Relevant background or scenario inferred from input  
    - Audience, tone, or environment (if implied or stated)  

    # ⚖️ Constraints
    - Explicit or implicit limits (time, length, performance, format, style, etc.)  
    - Safety, accessibility, or compliance hints (if mentioned)  

    # 🛠️ Process / Steps (if relevant)
    - Logical outline of steps, phases, or workflow to follow  
    - Conditionally included only when input implies a multi-step task  

    # 🎨 Format & Style
    - Expected output format (essay, code, image, bullet list, etc.)  
    - Style/tone/voice/medium as provided or inferred  

    # ✅ Success Criteria
    - Measurable signs of a good answer/output  
    - Derived from user input or context  

    # ➕ Enhancements
    - Smart additions: suggest improvements, clarifications, or refinements to make the prompt stronger  
    - Only if they add genuine value and don’t distort intent  

    # 🚫 Non-Goals
    - Things explicitly out of scope, or common misinterpretations to avoid  

    # 🔍 Input Provided
    - Include user’s raw input (verbatim, for traceability)  

    ---

    ### Rules Recap
    - Be adaptive: short input → minimal but structured output; rich input → deeply detailed, structured enhancement.  
    - Do not hallucinate technologies, frameworks, or parameters.  
    - Do not include your own commentary outside the structured format.  
    - Always output only the sections above, in this exact order.  

    Now, enhance this input:  

    {{input}}`,
    examples: [
      {
        input: "Write about dogs",
        expectedOutput:
          '# 🎯 Objective\n- Create an informative article about dogs covering characteristics, breeds, and care\n- Target pet owners and dog enthusiasts\n\n# 📋 Context\n- Audience: Pet owners and dog enthusiasts seeking reliable information\n- Format: Educational article for general readership\n- Tone: Friendly, accessible, and informative\n\n# ⚖️ Constraints\n- Length: 800-1000 words\n- Reading level: General audience, no technical jargon\n- Include practical, actionable advice\n\n# 🎨 Format & Style\n- Article format with clear headings and subheadings\n- Use bullet points for key information\n- Include relevant examples and anecdotes\n- Friendly, conversational tone\n\n# ✅ Success Criteria\n- Covers major dog breeds with key characteristics\n- Includes practical care tips (feeding, exercise, health)\n- Easy to read and engaging for pet owners\n- Provides actionable advice readers can implement\n\n# 🔍 Input Provided\n- "Write about dogs"',
        description: "General topic enhancement with structured output",
      },
      {
        input: "Create a marketing strategy for a startup",
        expectedOutput:
          '# 🎯 Objective\n- Develop a comprehensive marketing strategy for a startup\n- Focus on customer acquisition and brand building\n\n# 📋 Context\n- Early-stage startup with limited budget\n- Need to establish market presence and attract initial customers\n- Competitive landscape requires differentiation\n\n# ⚖️ Constraints\n- Limited marketing budget\n- Small team with limited marketing experience\n- Need measurable, cost-effective tactics\n\n# 🛠️ Process / Steps\n- Market research and competitor analysis\n- Define target audience and buyer personas\n- Develop brand positioning and messaging\n- Select appropriate marketing channels\n- Create content and campaign strategies\n- Establish metrics and tracking systems\n\n# 🎨 Format & Style\n- Strategic document with clear sections\n- Include specific tactics and timelines\n- Professional but accessible language\n\n# ✅ Success Criteria\n- Clear target audience definition\n- Budget-conscious channel recommendations\n- Measurable KPIs and success metrics\n- Actionable 90-day implementation plan\n\n# 🚫 Non-Goals\n- Avoid expensive traditional advertising\n- Don\'t focus on long-term brand building without short-term results\n\n# 🔍 Input Provided\n- "Create a marketing strategy for a startup"',
        description: "Business strategy enhancement with full structure",
      },
    ],
  },

  images: {
    id: "images",
    name: "Image Generation",
    description: "Optimize prompts for image generation models (Midjourney, FLUX, Stable Diffusion)",
    tags: ["images", "visual", "art", "generation"],
    isBuiltIn: true,
    systemPrompt: `You are an Expert Visual Prompt Engineer for image generation. 
      Transform the user’s rough input into a precise, structured, model-agnostic visual prompt. 
      Keep it concrete, neutral, and actionable.

      Hard Rules:
      - Do NOT invent model-specific parameters (no --ar, CFG, steps, seeds, samplers, etc.) unless explicitly in the input.
      - Never mention specific tools or models unless the user does.
      - If a field is not provided, omit it instead of writing “None” or guessing.
      - Use compact, concrete bullet fragments (5–15 tokens each).
      - Prefer physical/visual descriptions over vague adjectives.
      - If reference images are mentioned, describe their salient properties (colors, textures, layout) without URLs.
      - Return ONLY the structured sections below, no commentary.

      Output Format — return exactly these sections:

      **Subject**
      - [main subject(s)]
      - [pose/action/expression]
      - [scale vs frame]

      **Setting / Scene** (omit if not in input)
      - [environment, era/season, interior/exterior]
      - [background/foreground context]

      **Composition** (omit if not in input)
      - [framing & spacing]
      - [perspective/angle]
      - [depth cues / negative space]

      **Style & Medium** (omit if not in input)
      - [art medium / approach]
      - [aesthetic refs if provided]
      - [level of detail / texture]

      **Lighting** (omit if not in input)
      - [type & source]
      - [directionality / contrast]

      **Color & Materials** (omit if not in input)
      - [palette & mood]
      - [materials / textures]

      **Camera / Lens** (omit if not implied)
      - [focal length feel]
      - [depth of field / film vibe]

      **Details (Must-Have)** (omit if not in input)
      - [essential props, accessories, symbols]

      **Quality Tags**
      - [short list: clarity, edges, resolution, lighting]

      **Negative Prompt** (omit if user didn’t specify)
      - [undesired artifacts/content]

      **Output Controls**
      - [aspect intent or orientation if given]
      - [framing tightness / variation policy]

      Pre-flight self-check:
      - Remove filler like “None specified”.
      - Remove stack/tool mentions unless user provided.
      - Keep it concise, concrete, and model-agnostic.

      Now transform this prompt:

      {{input}}`,
    examples: [
      {
        input: "A beautiful sunset",
        expectedOutput:
          "**Subject**\n- Dramatic sunset landscape\n- Silhouetted mountain range\n- Wide natural vista\n\n**Setting / Scene**\n- Mountain landscape at golden hour\n- Clear evening sky with layered clouds\n- Natural outdoor environment\n\n**Composition**\n- Wide landscape orientation\n- Rule of thirds with horizon placement\n- Layered depth from foreground to background\n\n**Style & Medium**\n- Photorealistic rendering\n- Cinematic landscape photography style\n- High detail and clarity\n\n**Lighting**\n- Golden hour backlighting\n- Warm directional light from setting sun\n- Dramatic contrast between sky and silhouettes\n\n**Color & Materials**\n- Vibrant oranges and warm yellows in sky\n- Deep purples and magentas in clouds\n- Dark silhouetted mountains\n- Atmospheric haze and gradient transitions\n\n**Camera / Lens**\n- Wide-angle landscape perspective\n- Sharp focus throughout\n- Professional photography depth\n\n**Quality Tags**\n- High resolution, sharp details\n- Professional photography quality\n- Award-winning composition\n- Cinematic lighting\n\n**Negative Prompt**\n- blurry, low quality, oversaturated\n- artificial colors, unrealistic lighting\n- poor composition, tilted horizon",
        description: "Landscape image with detailed visual prompt",
      },
      {
        input: "Portrait of a woman in vintage style",
        expectedOutput:
          "**Subject**\n- Portrait of elegant woman\n- Classic pose, slight head tilt\n- Direct eye contact with camera\n\n**Style & Medium**\n- Vintage photography aesthetic\n- 1940s Hollywood glamour style\n- Classic portrait photography\n\n**Composition**\n- Medium close-up framing\n- Centered subject with headroom\n- Vertical portrait orientation\n\n**Lighting**\n- Soft studio lighting setup\n- Key light with gentle fill\n- Subtle rim lighting for separation\n\n**Color & Materials**\n- Warm sepia tones\n- Rich browns and cream colors\n- Soft, matte skin tones\n\n**Details (Must-Have)**\n- Period-appropriate hairstyle\n- Vintage jewelry or accessories\n- Classic makeup style\n\n**Camera / Lens**\n- Medium format photography feel\n- Shallow depth of field\n- Film photography grain texture\n\n**Quality Tags**\n- Professional portrait quality\n- Sharp focus on eyes\n- Smooth skin rendering\n- Classic vintage processing\n\n**Negative Prompt**\n- modern clothing, digital artifacts\n- harsh lighting, oversaturated colors\n- poor skin texture, blurry details",
        description: "Portrait photography with vintage styling",
      },
    ],
  },

  code: {
    id: "code",
    name: "Code & Technical",
    description: "Optimize prompts for coding assistance and technical tasks",
    tags: ["code", "programming", "technical", "development"],
    isBuiltIn: true,
    systemPrompt: `You are a Technical Prompt Specialist for coding tasks. Your job is to take a rough user request and turn it into a crisp, execution-ready prompt for a stronger coding model. Be precise, concise, and strictly neutral when technology choices are unknown.

      Hard Rules:
      - Never include chain-of-thought.
      - Do not invent APIs/endpoints/keys.
      - ❗ If stack/tools are NOT explicitly present in the user input, you MUST NOT introduce or assume them (no React, Next, Vue, Tailwind, Node, Prisma, etc.).
      - When the stack is unknown, speak in neutral terms (e.g., “markup”, “styles”, “component/function” without naming frameworks or libraries).
      - Respect any explicit style hints given by the user (e.g., BEM, Tailwind). If a hint is mentioned, you may reference it; otherwise keep styling minimal and generic.
      - Prefer smallest viable change and clarity over breadth.

      Output format — return ONLY:
      1) Improved Prompt (ready-to-paste for a stronger coding model):
        - Objective (what to build/fix)
        - Context (what matters to understand scope)
        - Constraints (performance, security, a11y, style hints, boundaries)
        - Files/Areas to Touch (neutral names unless the user provided specific filenames/paths)
        - Acceptance Criteria (testable)
        - I/O (inputs/outputs, interfaces, contracts)
        - Non-Goals (what to avoid)
        - Technology Mentions: ONLY if explicitly present in user input.
      2) Critical Questions (max 3, only if truly blocking).
      3) Risks & Assumptions (max 2 bullets).

      Caps for the downstream solution model (state them inside the Improved Prompt):
      - Max 120 lines of code OR 200 words total, whichever comes first.
      - Single file unless strictly necessary.

      Pre-flight self-check (perform silently, then enforce in output):
      - STACK-LEAK CHECK: Remove any stack/tool you added that wasn’t in user input.
      - FILE-NAMING CHECK: Use neutral filenames unless the user supplied exact names.
      - SCOPE CHECK: Keep to the smallest viable change.

      User Input:
      {{input}}`,
    examples: [
      {
        input: "Create a login form",
        expectedOutput:
          "**Improved Prompt:**\n\n# 💻 Objective\nCreate a user authentication form with email/password inputs and proper validation\n\n# 📋 Context\n- Authentication component for user login\n- Should handle form validation and submission\n- Include error handling for failed attempts\n\n# ⚖️ Constraints\n- Maximum 120 lines of code\n- Single file implementation\n- Accessible form controls (ARIA labels, keyboard navigation)\n- Form validation before submission\n- Secure handling of credentials\n\n# � Files/Areas to Touch\n- Main component file (login-form.tsx/js)\n- Supporting validation utilities if needed\n\n# ✅ Acceptance Criteria\n- Email and password input fields\n- Client-side validation (email format, password requirements)\n- Submit button with loading state\n- Error message display\n- Proper form accessibility\n- Clear visual feedback for validation states\n\n# � I/O\n- Input: User email and password\n- Output: Validated form data or error states\n- Interface: onSubmit callback with form data\n\n# 🚫 Non-Goals\n- Backend authentication logic\n- Password strength meter\n- Social login integration\n- Remember me functionality\n\n**Critical Questions:**\n1. Should this include any specific styling approach?\n2. What should happen after successful form validation?\n\n**Risks & Assumptions:**\n- Assumes standard email/password authentication flow\n- Form validation rules may need customization",
        description: "Login form creation with technical structure",
      },
      {
        input: "Fix performance issue in data table",
        expectedOutput:
          "**Improved Prompt:**\n\n# 💻 Objective\nOptimize data table performance for large datasets\n\n# 📋 Context\n- Existing data table component experiencing slow rendering\n- Performance degrades with large datasets (1000+ rows)\n- Need to maintain current functionality while improving speed\n\n# ⚖️ Constraints\n- Maximum 120 lines of code changes\n- Preserve existing API and props interface\n- Maintain accessibility features\n- No breaking changes to component usage\n\n# 📁 Files/Areas to Touch\n- Data table component file\n- Associated hooks or utilities\n- Row rendering logic\n\n# ✅ Acceptance Criteria\n- Smooth scrolling with large datasets\n- Reduced initial render time\n- Maintained sorting and filtering functionality\n- No visual regressions\n- Performance improvement measurable (render time < 100ms)\n\n# 🔄 I/O\n- Input: Array of data objects\n- Output: Optimized table rendering\n- Interface: Same props structure as current implementation\n\n# 🚫 Non-Goals\n- Complete table rewrite\n- Adding new features\n- Changing the visual design\n- Server-side pagination implementation\n\n**Critical Questions:**\n1. What specific performance metrics are most important?\n2. Are there constraints on which optimization techniques can be used?\n\n**Risks & Assumptions:**\n- Assumes virtualization is an acceptable solution\n- Current component structure allows for optimization",
        description: "Performance optimization with technical analysis",
      },
    ],
  },
};

export class PresetManager {
  static getBuiltInPresets(): PresetConfig[] {
    return Object.values(BUILT_IN_PRESETS);
  }

  static async getAllPresets(): Promise<PresetConfig[]> {
    const builtInPresets = this.getBuiltInPresets();
    const customPresets = await StorageManager.getCustomPresets();

    // merge: custom presets override built-in presets with same id
    const map: Record<string, PresetConfig> = {};
    for (const p of builtInPresets) map[p.id] = p;
    for (const p of customPresets) map[p.id] = p;
    return Object.values(map);
  }

  static async getPresetById(id: string): Promise<PresetConfig | null> {
    // Check custom presets first (allow override) then built-in
    const customPresets = await StorageManager.getCustomPresets();
    const custom = customPresets.find((preset) => preset.id === id);
    if (custom) return custom;

    if (BUILT_IN_PRESETS[id]) {
      return BUILT_IN_PRESETS[id];
    }

    return null;
  }

  static async saveCustomPreset(preset: Omit<PresetConfig, "isBuiltIn">): Promise<void> {
    const fullPreset: PresetConfig = {
      ...preset,
      isBuiltIn: false,
    };
    await StorageManager.saveCustomPreset(fullPreset);
  }

  static async deleteCustomPreset(id: string): Promise<void> {
    await StorageManager.deleteCustomPreset(id);
  }

  static validatePrompt(prompt: string) {
    return validatePrompt(prompt);
  }

  // Render a preset's systemPrompt replacing placeholders of the form:
  // {{key}} or {{key|default}} using provided inputs map.
  static renderPreset(preset: PresetConfig, inputs?: Record<string, string | number | boolean>): string {
    const template = preset.systemPrompt || "";

    const rendered = template.replace(/\{\{\s*([^}|]+)(?:\|([^}]+))?\s*\}\}/g, (_, key, def) => {
      const k = key.trim();
      const val = inputs && Object.prototype.hasOwnProperty.call(inputs, k) ? inputs[k] : undefined;
      if (val !== undefined && val !== null) return String(val);
      if (def !== undefined) return def;
      return "";
    });

    // Fallback: if no {{input}} placeholder was found and we have input, append it
    if (inputs?.input && !template.includes("{{input}}")) {
      return rendered + "\n\nUser input: " + inputs.input;
    }

    return rendered;
  }

  // Minimal preset validation: checks required fields exist
  static validatePreset(preset: Partial<PresetConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!preset) {
      errors.push("preset is null or undefined");
      return { valid: false, errors };
    }

    if (!preset.name || String(preset.name).trim().length === 0) errors.push("name is required");
    if (!preset.systemPrompt || String(preset.systemPrompt).trim().length === 0)
      errors.push("systemPrompt is required");

    // Validate that {{input}} placeholder exists
    if (preset.systemPrompt && !preset.systemPrompt.includes("{{input}}")) {
      errors.push("systemPrompt must contain {{input}} placeholder to receive user input");
    }

    return { valid: errors.length === 0, errors };
  }
}
