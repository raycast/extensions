![Promptify header](assets/header.png)

# Promptify - The Grammarly for Prompts 

> Transform any text into clear, structured prompts that get better AI results. One keystroke to enhance your prompts for any AI tool.

## 📦 Requirements

**Before using Promptify, you need:**

1. **Ollama installed and running** ([ollama.ai](https://ollama.ai/))
   - Run `ollama serve` in your terminal
   - Download a model: `ollama pull llama3.2:3b` (recommended, ~2GB)
   - Other compatible models: `llama3.2:1b`, `mistral`, `gemma2`

2. **Raycast**

**Privacy-first**: All processing happens locally on your machine. No data is sent to external servers.

## ✨ Features

- **🎯 General Enhancement**: Structure any prompt with clear objectives, context, and success criteria
- **🎨 Image Prompts**: Optimize for Nano Banana, Sora, Midjourney, FLUX, Stable Diffusion with visual elements and technical details
- **💻 Code Prompts**: Technical prompts with stack requirements, constraints, and best practices
- **🔒 Privacy First**: Works 100% locally with Ollama - your data never leaves your machine
- **📚 History & Export**: Save and export enhanced prompts as JSON for reuse
- **⚡ One-Click Workflow**: Copy text → Run command → Get enhanced version → Paste anywhere
- **🔁 Custom Presets**: Create, manage and share reusable prompt templates (see Presets Guide → Custom Presets)

## 🚀 Quick Start

New to Promptify? Start here:

👉 **[Complete Setup Guide](docs/01-setup.md)** - Installation, prerequisites, and configuration  
👉 **[5-Minute Quick Start](docs/02-quick-start.md)** - Get running in under 5 minutes  
👉 **[Complete User Guide](docs/03-user-guide.md)** - Master all features with examples  

### TL;DR Setup
1. **Install Ollama**: Download from [ollama.ai](https://ollama.ai/)
2. **Start Ollama**: Run `ollama serve` in terminal
3. **Download a model**: Run `ollama pull llama3.2:3b`
4. **Install Promptify**: Import into Raycast (Developer Mode)
5. **Test it**: Copy text → Run "Enhance Prompt (General)" → See magic ✨

## 📖 How It Works

Promptify transforms rough ideas into structured, effective prompts using three specialized presets. You can also create Custom Presets to define and reuse your own templates — see the Custom Presets section in the Presets Guide: `docs/04-presets-guide.md#custom-presets`.

**📚 [Complete Presets Guide](docs/04-presets-guide.md)** - Deep dive into all preset types with examples

### 🎯 General Enhancement
Perfect for content creation, articles, emails, and general AI interactions.

**[See full examples →](docs/04-presets-guide.md#general-enhancement-preset)**
```
Input: "Write about dogs"

Output:
# 🎯 Objective
- Create an informative article about dogs covering characteristics, breeds, and care
- Target pet owners and dog enthusiasts

# 📋 Context
- Audience: Pet owners and dog enthusiasts seeking reliable information
- Format: Educational article for general readership
- Tone: Friendly, accessible, and informative

# ⚖️ Constraints
- Length: 800-1000 words
- Reading level: General audience, no technical jargon
- Include practical, actionable advice

# 🎨 Format & Style
- Article format with clear headings and subheadings
- Use bullet points for key information
- Include relevant examples and anecdotes
- Friendly, conversational tone

# ✅ Success Criteria
- Covers major dog breeds with key characteristics
- Includes practical care tips (feeding, exercise, health)
- Easy to read and engaging for pet owners
- Provides actionable advice readers can implement

# 🔍 Input Provided
- "Write about dogs"
```
```
Input: "Write about dogs"

Output:
# 🎯 Objective
Create an informative article about dogs covering characteristics, breeds, and care

# 📋 Context  
Target audience: Pet owners and dog enthusiasts
Tone: Friendly and informative

# 🎨 Format & Style
Article format, 800-1000 words, with clear headings and bullet points

# ✅ Success Criteria
- Covers different dog breeds
- Includes care tips  
- Easy to read and engaging
```

### 🎨 Image Enhancement
Optimized for Midjourney, DALL-E, Stable Diffusion, and all image generation models.

**[See advanced techniques →](docs/04-presets-guide.md#images-enhancement-preset)**
```
Input: "A beautiful sunset"

Output:
**Subject**
- Dramatic sunset landscape
- Silhouetted mountain range
- Wide natural vista

**Setting / Scene**
- Mountain landscape at golden hour
- Clear evening sky with layered clouds
- Natural outdoor environment

**Composition**
- Wide landscape orientation
- Rule of thirds with horizon placement
- Layered depth from foreground to background

**Style & Medium**
- Photorealistic rendering
- Cinematic landscape photography style
- High detail and clarity

**Lighting**
- Golden hour backlighting
- Warm directional light from setting sun
- Dramatic contrast between sky and silhouettes

**Color & Materials**
- Vibrant oranges and warm yellows in sky
- Deep purples and magentas in clouds
- Dark silhouetted mountains
- Atmospheric haze and gradient transitions

**Camera / Lens**
- Wide-angle landscape perspective
- Sharp focus throughout
- Professional photography depth

**Quality Tags**
- High resolution, sharp details
- Professional photography quality
- Award-winning composition
- Cinematic lighting

**Negative Prompt**
- blurry, low quality, oversaturated
- artificial colors, unrealistic lighting
- poor composition, tilted horizon
```

### 💻 Code Enhancement
Technical prompts for programming, APIs, architecture, and development tasks.

**[See code examples →](docs/04-presets-guide.md#code-enhancement-preset)**
```
Input: "Create a login form"

Output:
**Improved Prompt:**

# 💻 Objective
Create a user authentication form with email/password inputs and proper validation

# 📋 Context
- Authentication component for user login
- Should handle form validation and submission
- Include error handling for failed attempts

# ⚖️ Constraints
- Maximum 120 lines of code
- Single file implementation
- Accessible form controls (ARIA labels, keyboard navigation)
- Form validation before submission
- Secure handling of credentials

# � Files/Areas to Touch
- Main component file (login-form.tsx/js)
- Supporting validation utilities if needed

# ✅ Acceptance Criteria
- Email and password input fields
- Client-side validation (email format, password requirements)
- Submit button with loading state
- Error message display
- Proper form accessibility
- Clear visual feedback for validation states

# 🔄 I/O
- Input: User email and password
- Output: Validated form data or error states
- Interface: onSubmit callback with form data

# 🚫 Non-Goals
- Backend authentication logic
- Password strength meter
- Social login integration
- Remember me functionality

**Critical Questions:**
1. Should this include any specific styling approach?
2. What should happen after successful form validation?

**Risks & Assumptions:**
- Assumes standard email/password authentication flow
- Form validation rules may need customization
```

## ⚙️ Configuration

**📚 [Complete Setup Guide](docs/01-setup.md)** - Detailed configuration and troubleshooting

### Quick Settings
Access via Raycast Preferences → Extensions → Promptify:

- **AI Provider**: Ollama (default) 
- **Ollama URL**: `http://localhost:11434` (default)
- **Ollama Model**: `llama3.2:3b` (default)
- **Auto Paste**: Automatically paste after copying (optional)
- **Save to History**: Auto-save enhanced prompts (default: enabled)
- **Max History Items**: Maximum items to keep in history (default: 50, configurable in preferences)

## 📋 Commands

**📚 [User Guide](docs/03-user-guide.md)** - Complete feature walkthrough with examples  
**📚 [History Management](docs/05-history-management.md)** - Organize and reuse your prompts

| Command | Description | Shortcut |
|---------|-------------|----------|
| **Enhance Prompt (General)** | Structure any prompt with objectives and context | Set in Raycast |
| **Enhance Prompt — Images** | Optimize for image generation models | Set in Raycast |
| **Enhance Prompt — Code** | Technical prompts for coding assistance | Set in Raycast |
| **History** | Browse, copy, and manage saved prompts | Set in Raycast |
| **Manage Presets** | Create, edit, import/export and use custom presets | Set in Raycast |

## 💡 Use Cases

### Content Creation
- Transform rough ideas into detailed article briefs
- Create structured prompts for ChatGPT/Claude
- Build consistent content templates

### Visual Design  
- Generate detailed prompts for Midjourney
- Optimize descriptions for FLUX/Stable Diffusion
- Create consistent visual style guides

### Development
- Structure technical requirements for coding AI
- Create clear bug report templates
- Build reusable code prompt libraries

### Team Collaboration
- Standardize prompt formats across team
- Share enhanced prompts via JSON export
- Build prompt libraries for repeated tasks

## 📚 Documentation

### 🚀 Getting Started
- **[Setup Guide](docs/01-setup.md)** - Installation, prerequisites, and configuration
- **[Quick Start](docs/02-quick-start.md)** - Get running in 5 minutes
- **[User Guide](docs/03-user-guide.md)** - Complete feature walkthrough

### 🎯 Advanced Usage  
- **[Presets Guide](docs/04-presets-guide.md)** - Master all three preset types
- **[History Management](docs/05-history-management.md)** - Organize and reuse prompts
- **[Customization](docs/09-customization.md)** - Advanced configuration options

### 🛠️ Development
- **[Architecture](docs/06-architecture.md)** - System design and patterns
- **[Development Guide](docs/07-development.md)** - Contributing and code standards
- **[API Reference](docs/08-api-reference.md)** - Technical documentation

### 🆘 Support
- **[Troubleshooting](docs/10-troubleshooting.md)** - Common issues and solutions
- **[Deployment](docs/11-deployment.md)** - Building and distribution

**📖 [Documentation Hub](docs/00-overview.md)** - Complete documentation index

## 🛠️ Development

**📚 [Development Guide](docs/07-development.md)** - Setup, standards, and contribution guidelines  
**📚 [Architecture Overview](docs/06-architecture.md)** - Technical design and patterns

### Quick Development Setup
```bash
git clone https://github.com/Thomas-Basadonne/promptify-raycast.git
cd promptify-raycast
npm install
npm run dev
```

### Project Structure
```
├── commands/           # Main Raycast commands
│   ├── enhance-prompt-general.tsx
│   ├── enhance-prompt---images.tsx  
│   ├── enhance-prompt---code.tsx
│   └── history.tsx
├── core/              # Business logic
│   ├── types.ts       # TypeScript interfaces
│   ├── presets.ts     # Preset definitions
│   └── storage.ts     # LocalStorage utilities
├── providers/         # AI provider integrations
│   ├── base.ts        # Provider interface
│   ├── ollama.ts      # Ollama implementation
│   └── index.ts       # Provider factory
└── docs/             # Documentation
    ├── 00-overview.md    # Documentation hub
    ├── 01-setup.md       # Installation guide
    ├── 02-quick-start.md # Getting started
    ├── 03-user-guide.md  # Complete features
    ├── 04-presets-guide.md # Preset deep-dive
    ├── 05-history-management.md # History features
    ├── 06-architecture.md # Technical design
    ├── 07-development.md # Contributing guide
    └── 10-troubleshooting.md # Issue solutions
```

### Contributing
1. **Read the [Development Guide](docs/07-development.md)**
2. **Check [Architecture](docs/06-architecture.md)** for design patterns
3. **Submit PR** following our contribution guidelines

## 🔍 Troubleshooting

**📚 [Complete Troubleshooting Guide](docs/10-troubleshooting.md)** - Detailed solutions for all issues

### Quick Fixes

**"AI provider is not available"**
- Ensure Ollama is running: `ollama serve`
- Check model is installed: `ollama list`
- Verify URL in preferences: `http://localhost:11434`

**"No text found in clipboard"**
- Copy some text before running the command
- Check clipboard permissions in System Preferences

**Slow performance**
- Try a smaller/faster model: `ollama pull llama3.2:3b`
- Check available system resources
- Reduce prompt length if very long

**History not saving**
- Check "Save to History" is enabled in preferences
- Verify LocalStorage isn't full
- Try clearing history if corrupted

### Need More Help?
- **[Troubleshooting Guide](docs/10-troubleshooting.md)** - Comprehensive issue solutions
- **[Setup Guide](docs/01-setup.md)** - Installation and configuration help
- **[GitHub Issues](https://github.com/Thomas-Basadonne/promptify-raycast/issues)** - Report bugs or request features
- **[Raycast Discord](https://raycast.com/community)** - Community support

## 🗺️ Roadmap

### v1.1 — UX & polish (near-term)
- Custom presets: create and manage user-defined prompt presets — Implemented
- Templates & built-in templates: save common prompt patterns as reusable templates
- Improved error handling & loading states: clearer messages and better UX during long operations
- Performance optimizations: faster load times and snappier UI

### v1.2 — Interoperability & export (next)
- OpenAI / Anthropic provider support: add non-local provider options
- Batch prompt processing: process multiple prompts in one action
- Advanced export: bulk export, multiple formats (JSON variants, CSV, etc.)
- Import JSON / preset sharing: import/export presets and share templates

### v1.3 — Organize & search
- Smart Search: AI-powered semantic search across history and templates
- Categories / tagging: organize prompts by project, tag, or category
- Auto-cleanup policy: configurable retention (30/90/365 days)

### v2.0 — Teams & Cloud
- Cloud sync: cross-device history and settings synchronization
- Team libraries & sharing: shared preset libraries for teams
- API & third-party integrations: public API and integrations with external tools
- Analytics & usage insights: usage metrics, top presets, and performance dashboards

### Longer-term
- Real-time collaboration: multi-user editing and shared sessions
- Microservices / scalable backend: decouple the enhancement engine for scale
- Plugin marketplace: third-party plugins for presets and providers

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Raycast](https://raycast.com/) for the amazing platform
- [Ollama](https://ollama.ai/) for local AI inference
- The open-source community for inspiration and feedback

## 📖 Documentation Navigation

### 🚀 New Users
**Start here** → [Setup](docs/01-setup.md) → [Quick Start](docs/02-quick-start.md) → [User Guide](docs/03-user-guide.md)

### 🎯 Power Users  
**Advanced usage** → [Presets Guide](docs/04-presets-guide.md) → [History Management](docs/05-history-management.md) → [Customization](docs/09-customization.md)

### 🛠️ Developers
**Technical docs** → [Architecture](docs/06-architecture.md) → [Development Guide](docs/07-development.md) → [API Reference](docs/08-api-reference.md)

### 🆘 Need Help?
**Support** → [Troubleshooting](docs/10-troubleshooting.md) → [GitHub Issues](https://github.com/Thomas-Basadonne/promptify-raycast/issues)

**📚 [Complete Documentation Index](docs/00-overview.md)** - All guides and references

---

**Built with ❤️ for the productivity community**

*Promptify helps you get better AI results by transforming rough ideas into clear, structured prompts. Perfect for ChatGPT, Claude, Midjourney, coding assistants, and any AI tool that needs well-formatted input.*