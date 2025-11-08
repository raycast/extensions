# Presets Guide

Understand and master Promptify's three specialized preset types to get the best results for different use cases.

## 📋 Overview

Promptify includes three carefully crafted presets, each optimized for specific types of AI interactions:

- **🎯 General**: Structure any prompt with clear objectives and context
- **🎨 Images**: Optimize for image generation models with visual specifications  
- **💻 Code**: Technical prompts with requirements and implementation details

## 🎯 General Enhancement Preset

### When to Use
- Blog posts and articles
- Email campaigns  
- Social media content
- Creative writing
- Research requests
- General AI conversations

### Output Structure
```markdown
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
- Smart additions: suggest improvements, clarifications, or refinements
- Only if they add genuine value and don't distort intent

# 🚫 Non-Goals
- Things explicitly out of scope, or common misinterpretations to avoid

# 🔍 Input Provided
- Include user's raw input (verbatim, for traceability)
```

### Detailed Examples

#### Blog Post Enhancement
```
Input: "Write about remote work"

Enhanced Output:
# 🎯 Objective
- Create an informative guide about effective remote work practices
- Target professionals transitioning to remote work for the first time

# 📋 Context
- Audience: Professionals new to remote work, feeling uncertain about best practices
- Tone: Helpful and encouraging, professional but approachable
- Current trend: Increased remote work adoption post-pandemic

# ⚖️ Constraints
- Length: 1200-1500 words for comprehensive coverage
- Reading level: Professional but accessible, avoid jargon
- Structure: Scannable with clear sections and takeaways

# 🛠️ Process / Steps
- Address common remote work challenges
- Provide specific, actionable solutions
- Include tools and resource recommendations
- Build confidence for remote work transition

# 🎨 Format & Style
- Blog post format with engaging introduction using statistics
- 5-7 main sections with actionable tips
- Bullet points for key takeaways
- Conclusion with clear next steps

# ✅ Success Criteria
- Addresses specific remote work pain points
- Provides immediately actionable advice
- Includes practical tools and resources
- Reduces anxiety about remote work transition
- Easy to scan and implement

# ➕ Enhancements
- Include real-world success stories or case studies
- Add downloadable checklist or template
- Suggest follow-up topics for series

# 🚫 Non-Goals
- Avoid generic productivity advice not specific to remote work
- Don't focus on company policy creation
- Skip technical setup details for specific tools

# 🔍 Input Provided
- "Write about remote work"
```

#### Email Campaign Enhancement
```
Input: "Newsletter about new features"

Enhanced Output:
# 🎯 Objective
- Create compelling product update newsletter showcasing new features
- Drive user engagement and feature adoption

# 📋 Context
- Product: SaaS productivity tool with 10k+ active users
- Audience: Existing subscribers who use the product regularly
- Timing: Monthly feature update newsletter
- Brand voice: Friendly, helpful, innovation-focused

# ⚖️ Constraints
- Email length: Scannable in under 2 minutes
- Mobile-optimized design required
- Compliance with email marketing regulations
- Maintain consistent brand voice and visual identity

# 🛠️ Process / Steps
- Craft compelling subject line options
- Structure content with clear hierarchy
- Highlight benefits, not just features
- Include clear calls-to-action
- Add social proof or user testimonials

# 🎨 Format & Style
- Email newsletter format with personal greeting from founder/team
- Feature highlights with benefits-focused copy
- Visual callouts for key improvements
- Clear CTAs for feature exploration
- User testimonial or success story integration

# ✅ Success Criteria
- High open rate (>25% based on industry average)
- Increased feature adoption within 7 days
- Positive reply sentiment and engagement
- Clear value communication for each feature
- Drives traffic to specific product areas

# ➕ Enhancements
- A/B test subject line variations
- Include usage tips for new features
- Add personalization based on user segments
- Create follow-up sequence for non-engagers

# 🚫 Non-Goals
- Avoid overwhelming with too many features
- Don't focus on technical implementation details
- Skip generic marketing language without substance

# 🔍 Input Provided
- "Newsletter about new features"
```

### Tips for Better General Enhancements

1. **Be Specific About Audience**: "Marketing professionals" vs "people interested in marketing"
2. **Include Tone Requirements**: Professional, casual, technical, beginner-friendly
3. **Specify Length**: Word count, reading time, or section requirements
4. **Add Context**: Industry, current events, specific use case

## 🎨 Images Enhancement Preset

### When to Use
- Midjourney prompts
- DALL-E generation
- Stable Diffusion
- Adobe Firefly
- Any AI image generation tool

### Output Structure
```markdown
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

**Negative Prompt** (omit if user didn't specify)
- [undesired artifacts/content]

**Output Controls**
- [aspect intent or orientation if given]
- [framing tightness / variation policy]
```

### Detailed Examples

#### Product Photography Enhancement
```
Input: "Professional photo of smartphone"

Enhanced Output:
**Subject**
- Latest flagship smartphone
- Positioned at 45-degree angle
- Clean surface placement

**Setting / Scene**
- Minimalist studio environment
- Clean, neutral background
- Professional commercial setting

**Composition**
- Centered product with rule of thirds
- Shallow depth of field
- Clean negative space around subject

**Style & Medium**
- Commercial product photography
- Apple-style clean presentation
- Minimalist aesthetic approach

**Lighting**
- Soft, diffused studio lighting
- Key light from upper left
- Subtle fill light from right
- Rim lighting for separation

**Color & Materials**
- Neutral color palette
- Deep blacks and clean whites
- Subtle warm color temperature
- Premium material textures visible

**Camera / Lens**
- Macro lens perspective
- 85mm equivalent focal length
- f/8 for optimal sharpness

**Details (Must-Have)**
- Visible screen reflection
- Pristine surface without fingerprints
- Subtle shadow beneath device

**Quality Tags**
- 8K resolution
- Commercial quality
- Pin-sharp focus
- Professional photography

**Negative Prompt**
- cluttered background, harsh shadows
- oversaturated colors, visible fingerprints
- dusty surface, amateur lighting
```

#### Artistic Illustration Enhancement
```
Input: "Fantasy forest scene"

Enhanced Output:
**Subject**
- Mystical ancient forest
- Towering trees reaching skyward
- Ethereal atmosphere throughout

**Setting / Scene**
- Ancient woodland environment
- Multiple depth layers visible
- Magical, otherworldly atmosphere

**Composition**
- Vertical orientation emphasizing tree height
- Winding path leading into distance
- Multiple depth layers for scale

**Style & Medium**
- Digital fantasy art
- Painterly technique
- Studio Ghibli and Hayao Miyazaki inspired

**Lighting**
- Magical golden hour light
- Volumetric light rays streaming through leaves
- Bioluminescent elements glowing softly

**Color & Materials**
- Rich emerald greens with warm golden accents
- Cool blue shadows
- Touches of magical purple and teal
- Ancient moss-covered bark texture

**Camera / Lens**
- Wide-angle perspective to capture scale
- Cinematic aspect ratio
- Slight upward angle

**Details (Must-Have)**
- Floating magical particles
- Delicate ferns and undergrowth
- Hidden fairy lights
- Ancient moss textures

**Quality Tags**
- Concept art quality
- Highly detailed
- Painterly textures
- Fantasy illustration

**Negative Prompt**
- realistic photography, modern elements
- harsh lighting, desaturated colors
- simple trees, empty forest
```

### Advanced Image Techniques

#### Style Mixing
```
**Style:** Blend of Art Nouveau illustration with modern digital art techniques, Gustav Klimt inspired patterns with contemporary color palette
```

#### Specific Camera Effects
```
**Camera/Lens:** Tilt-shift photography effect, 35mm film grain, vintage lens aberrations, bokeh highlights
```

#### Mood and Atmosphere
```
**Color:** Moody cinematic grading, desaturated with selective color pops, film noir lighting with modern twist
```

## 💻 Code Enhancement Preset

### When to Use
- Programming tasks
- API design
- Technical specifications
- Code reviews
- Architecture planning
- DevOps configurations

### Output Structure
```markdown
**Improved Prompt:**

# 💻 Objective
[What to build/fix - specific programming goal]

# 📋 Context
[What matters to understand scope - background information]

# ⚖️ Constraints
[Performance, security, accessibility, style hints, boundaries]

# � Files/Areas to Touch
[Neutral names unless user provided specific filenames/paths]

# ✅ Acceptance Criteria
[Testable requirements and success metrics]

# 🔄 I/O
[Inputs/outputs, interfaces, contracts]

# 🚫 Non-Goals
[What to avoid - scope limitations]

**Critical Questions:** (max 3, only if truly blocking)
[Questions that would significantly impact the solution]

**Risks & Assumptions:** (max 2 bullets)
[Key assumptions and potential risks]
```
[Functional requirements, technical constraints, specifications]

# 🎯 Expected Output
[Code format, documentation needs, deliverables]

# 🔍 Constraints & Considerations
[Performance, security, best practices, edge cases]

# 📚 Context
[Additional background, existing systems, integrations]
```

### Detailed Examples

#### React Component Enhancement
```
Input: "User profile component"

Enhanced Output:
**Improved Prompt:**

# 💻 Objective
Create a reusable user profile component with edit functionality and real-time updates

# � Context
- Authentication component for displaying and editing user information
- Part of larger dashboard application with consistent design system
- Needs to integrate with existing user management REST API
- Should work with existing authentication middleware

# ⚖️ Constraints
- Maximum 120 lines of code
- Single file implementation preferred
- Accessible form controls (ARIA labels, keyboard navigation)
- Responsive design for mobile and desktop
- Performance: optimize re-renders with React.memo
- Security: sanitize inputs, validate file uploads

# 📁 Files/Areas to Touch
- Main user profile component file
- Supporting validation utilities if needed
- Type definitions for user data structure

# ✅ Acceptance Criteria
- Display user information (name, email, avatar, bio)
- Toggle between view and edit modes seamlessly
- Real-time validation for form fields
- Image upload functionality for avatar
- Loading states and comprehensive error handling
- Optimistic updates with rollback on error
- WCAG 2.1 AA compliance

# 🔄 I/O
- Input: User object with profile data
- Output: Updated user data on successful edit
- Interface: onUpdate callback with validated form data
- Error handling: onError callback for failed operations

# � Non-Goals
- Backend user management logic
- Complex image editing features
- Social media integration
- Admin-level user management

**Critical Questions:**
1. Should this include TypeScript types or plain JavaScript?
2. What specific validation rules are required for user fields?
3. Are there existing design system components to use?

**Risks & Assumptions:**
- Assumes standard REST API for user updates
- Component may need customization for different user roles
```

#### API Design Enhancement
```
Input: "REST API for task management"

Enhanced Output:
**Improved Prompt:**

# 💻 Objective
Design and implement a RESTful API for task management with real-time updates and team collaboration

# � Context
- Replacing legacy PHP application with modern architecture
- Needs integration with existing LDAP authentication system
- Will serve both web frontend and mobile applications
- Requires data migration from existing MySQL database
- Must maintain backwards compatibility during transition

# ⚖️ Constraints
- Maximum 120 lines of code per endpoint
- Handle 1000+ concurrent users
- OWASP Top 10 compliance required
- Stateless design for horizontal scaling
- API versioning support needed
- Comprehensive error handling

# 📁 Files/Areas to Touch
- Main API router and endpoint definitions
- Database schema and migration files
- Authentication and authorization middleware
- Real-time WebSocket integration
- Input validation schemas

# ✅ Acceptance Criteria
- CRUD operations for tasks, projects, and teams
- User authentication and authorization (RBAC)
- Real-time task updates and notifications
- Task filtering, sorting, and search capabilities
- Activity logging and audit trails
- Rate limiting and request throttling
- Complete OpenAPI/Swagger documentation
- Unit and integration test coverage >90%

# 🔄 I/O
- Input: HTTP requests with JSON payloads
- Output: JSON responses with consistent error formats
- Interface: RESTful endpoints with proper HTTP status codes
- WebSocket events for real-time features

# 🚫 Non-Goals
- Frontend application development
- Complex reporting and analytics features
- Third-party service integrations beyond authentication
- Advanced workflow automation

**Critical Questions:**
1. What specific authentication roles and permissions are required?
2. Are there existing API standards or conventions to follow?
3. What are the specific performance benchmarks for response times?

**Risks & Assumptions:**
- Assumes LDAP integration can be maintained during migration
- Database migration complexity may require phased rollout approach
```

### Code-Specific Tips

1. **Version Specifications**: Always include specific versions for frameworks and tools
2. **Testing Requirements**: Specify coverage requirements and testing strategies  
3. **Performance Criteria**: Include specific performance benchmarks
4. **Security Considerations**: Address common security vulnerabilities
5. **Documentation Needs**: Specify API docs, code comments, README requirements

## 🎯 Choosing the Right Preset

### Decision Matrix

| Use Case | General | Images | Code |
|----------|---------|--------|------|
| Blog post | ✅ Primary | ❌ | ❌ |
| Social media | ✅ Primary | 🟡 Visuals | ❌ |
| Midjourney prompt | ❌ | ✅ Primary | ❌ |
| React component | 🟡 Planning | ❌ | ✅ Primary |
| Email campaign | ✅ Primary | 🟡 Images | ❌ |
| API documentation | 🟡 Overview | ❌ | ✅ Primary |
| Creative writing | ✅ Primary | 🟡 Inspiration | ❌ |
| Technical specification | 🟡 General | ❌ | ✅ Primary |

### When to Combine Presets

Sometimes you need multiple perspectives:

1. **Product Launch**: General (marketing copy) + Images (visuals) + Code (technical specs)
2. **Tutorial Content**: General (structure) + Code (examples)
3. **Design System**: Images (components) + Code (implementation)

### Custom Workflows

#### Multi-Step Enhancement
```
Step 1: "Mobile app for fitness tracking" → General
Step 2: Use output → Images (for UI mockups)
Step 3: Use output → Code (for technical architecture)
```

#### Iterative Refinement
```
Round 1: Basic input → Enhanced output
Round 2: Enhanced output as new input → More detailed output
Round 3: Specific aspects → Final refinement
```

## Custom Presets

Custom presets let you save, reuse, and share your own prompt templates in Promptify. They are templates that the built-in enhancement commands use to transform your raw text into structured prompts. Use custom presets when you have repetitive prompt formats or specialized workflows (team conventions, project-specific templates, etc.).

### Where to manage them

Open the **Manage Presets** command from the Raycast command palette. From there you can:

- Create a new preset (name, optional description, and the system / template prompt)
- Edit an existing preset
- Duplicate a preset as a starting point
- Delete a preset
- Export a single preset as JSON
- Export all custom presets (bulk export)
- Import a single preset or a bulk export via clipboard or file
- Immediately use any preset to enhance the current clipboard content

All actions provide success/failure toasts for quick feedback.

### Template syntax and placeholders

Presets are plain text templates with simple placeholder support. The most important placeholder is `{{input}}` — this is where the user's selected text (or clipboard text) is inserted into the template when the preset runs.

- `{{input}}` — REQUIRED for correct behavior. Presets are validated to ensure `{{input}}` is present. If a template does not contain `{{input}}` the editor will warn you and saving will show a validation error.
- `{{key}}` or `{{key|default}}` — Optional named placeholders. When present, the preset renderer will replace `{{key}}` if a value is supplied; if not, the `default` after the pipe is used. This is useful for fields like `{{tone|neutral}}` or `{{audience|developers}}`.

Example template (General):

```
# 🎯 Objective
Create an informative article about: {{input}}

# 📋 Context
Target audience: {{audience|general readers}}
Tone: {{tone|friendly}}

# ✅ Success Criteria
- Clear sections and headings
- Actionable takeaways
```

Example template (Code):

```
# 💻 Task
Refactor or implement: {{input}}

# 🛠️ Constraints
- Language: {{language|TypeScript}}
- Target framework: {{framework|React}}
```

Renderer behavior note: as a safety fallback, if a preset somehow lacks `{{input}}` at runtime the extension will append the user input to the end of the rendered prompt so the user's text is not silently dropped. However, the editor enforces `{{input}}` at save-time and will warn — adding `{{input}}` to the template is still the correct approach.

### Import / Export and sharing

- Export single preset: saves one preset to a JSON blob you can copy or share.
- Export all: creates a bulk JSON export containing all custom presets (useful for backups and sharing across machines/teammates).
- Import single / bulk: the import UI accepts either a single preset JSON or the bulk export. The importer will validate incoming presets and report any invalid entries.

Tips:
- You can paste exported JSON directly into the import dialog or use clipboard import for quick sharing.
- Duplicate first if you want to tweak a shared preset without overwriting the original.

### Persistence and limits

Custom presets are stored locally in Raycast's local storage. They persist across Raycast and system restarts. There is a small limit to keep things responsive:

- Maximum custom presets: 20 (Least-recently-used trimming is applied when the limit is exceeded)
- Storage key (internal): `promptify.presets.custom` (for debugging/backups only)

If you need more than 20 presets, export them and import as needed or keep a separate JSON file with your library.

### How to use a custom preset

1. Copy the text you want to enhance.
2. Run one of the enhancement commands (for example: Enhance Prompt (General)).
3. In the preset selector choose a built-in or any of your custom presets.
4. The command will render the template by replacing placeholders and send the final prompt to the AI provider.
5. Enhanced output can be copied, auto-pasted (preference), and saved to history.

### Validation and common errors

- Missing name or missing `{{input}}` will block saving a preset and show a validation error.
- Importing invalid JSON will be rejected with an error message; check that the JSON matches the exported structure.
- If an enhanced result looks wrong, inspect the preset for typos in placeholders or missing fields.

### Best practices and examples

- Always include `{{input}}` where you expect the user's content to appear.
- Use named placeholders with defaults for optional configuration: `{{audience|developers}}`.
- Keep templates focused — shorter templates are easier to maintain and less likely to produce unexpected outputs.
- Use exports to backup team libraries and share templates with teammates.

### Troubleshooting

- "My input disappeared": check that the preset contains `{{input}}`. If not, add it or re-order the template so the placeholder is included. The fallback appends input, but the editor's validation aims to prevent this class of issues.
- "Import failed": verify the JSON is a preset or a bulk export produced by Promptify. Try exporting from the source machine and re-importing.
- "I hit a shortcut warning": Raycast reserves several system shortcuts; Promptify avoids reserved combos. If you see a reserved shortcut warning, open the preset editor and change the local shortcut in the command definition.

If you want, I can also add a short in-app help snippet inside the preset editor reminding users that `{{input}}` is required and showing examples. Let me know if you prefer that user-facing copy or if you'd like different wording for any section.

---

**Next**: Learn about [History Management](05-history-management.md) to organize and reuse your successful prompts!
