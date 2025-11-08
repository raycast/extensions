# Quick Start Guide

Get up and running with Promptify in under 5 minutes. This guide assumes you've completed the [Setup Guide](01-setup.md).

## 🎯 Your First Enhancement

Let's enhance your first prompt to see Promptify in action.

### Step 1: Copy Some Text
Copy this example text to your clipboard:
```
Write about sustainable energy
```

### Step 2: Open Raycast
- Press your Raycast hotkey (default: `⌘ + Space`)
- Or click the Raycast icon in your menu bar

### Step 3: Run Promptify
Type: `Enhance Prompt (General)` and press Enter

### Step 4: See the Magic ✨
You should see something like this:

**Original:**
```
Write about sustainable energy
```

**Enhanced:**
```
# 🎯 Objective
- Create a comprehensive article about sustainable energy sources
- Focus on environmental impact and practical applications

# 📋 Context
- Audience: General readers interested in environmental topics
- Tone: Informative, engaging, and accessible
- Current context: Growing interest in climate solutions

# ⚖️ Constraints
- Length: 1000-1500 words for comprehensive coverage
- Reading level: General audience, avoid technical jargon
- Include current data and statistics

# 🎨 Format & Style
- Article format with clear headings and subheadings
- Use practical examples and case studies
- Include bullet points for key information
- Engaging, optimistic tone

# ✅ Success Criteria
- Covers major sustainable energy types (solar, wind, hydro, etc.)
- Explains benefits and challenges clearly
- Includes current statistics and trends
- Provides actionable insights for readers
- Easy to understand for non-technical audience

# 🔍 Input Provided
- "Write about sustainable energy"
```

### Step 5: Use Your Enhanced Prompt
- **Copy**: `⌘ + C` to copy the enhanced version
- **Paste**: Switch to your AI tool and paste
- **Save**: It's automatically saved to history (if enabled)

## 🎨 Try Different Preset Types

Promptify has three specialized presets. Let's try them all:

### General Enhancement
**Best for**: Articles, essays, general content

**Try this**: "Explain machine learning"
**Command**: `Enhance Prompt (General)`

### Image Generation
**Best for**: Midjourney, FLUX, Stable Diffusion, DALL-E

**Try this**: "A cozy coffee shop"
**Command**: `Enhance Prompt — Images`

**Expected output**:
```
**Subject**
- Warm, inviting coffee shop interior
- Customers enjoying coffee and conversation
- Cozy seating arrangements

**Setting / Scene**
- Interior coffee shop environment
- Afternoon atmosphere with natural light
- Urban or neighborhood setting

**Composition**
- Interior shot with inviting perspective
- Multiple seating areas visible
- Depth showing different spaces

**Style & Medium**
- Photorealistic rendering
- Cozy, welcoming atmosphere
- Contemporary coffee shop aesthetic

**Lighting**
- Soft warm lighting throughout
- Golden hour window light streaming in
- Ambient interior lighting

**Color & Materials**
- Warm browns and rich wood tones
- Cream and soft yellow accents
- Natural materials and textures

**Details (Must-Have)**
- Exposed brick walls or warm textures
- Vintage or modern furniture
- Steaming coffee cups and pastries
- Books or magazines on tables

**Quality Tags**
- High resolution, professional photography
- Warm, inviting atmosphere
- Commercial photography quality

**Negative Prompt**
- crowded, cold, sterile environment
- harsh lighting, empty spaces
```

### Code & Technical
**Best for**: Programming tasks, technical documentation

**Try this**: "Build a login form"
**Command**: `Enhance Prompt — Code`

**Expected output**:
```
**Improved Prompt:**

# 💻 Objective
Create a secure and accessible user authentication form with proper validation

# � Context
- Authentication component for user login
- Should handle form validation and submission
- Include error handling for failed attempts
- Part of larger web application

# ⚖️ Constraints
- Maximum 120 lines of code
- Single file implementation preferred
- Accessible form controls (ARIA labels, keyboard navigation)
- Form validation before submission
- Secure handling of credentials

# 📁 Files/Areas to Touch
- Main form component file
- Supporting validation utilities if needed
- CSS styling for form layout

# ✅ Acceptance Criteria
- Email/username and password input fields
- Client-side validation with clear error messages
- Submit button with loading state
- Proper form accessibility compliance
- Responsive design for mobile and desktop
- Password visibility toggle functionality

# 🔄 I/O
- Input: User credentials (email/username, password)
- Output: Validated form data for authentication
- Interface: onSubmit callback with form data

# 🚫 Non-Goals
- Backend authentication logic
- Password strength meter
- Social login integration
- User registration functionality

**Critical Questions:**
1. Should this use any specific styling framework?
2. What should happen after successful form submission?

**Risks & Assumptions:**
- Assumes standard email/password authentication flow
- Form validation rules may need customization based on requirements
```
- Accessibility features implementation
- Usage examples and documentation
```

## 📚 Managing Your History

Every enhanced prompt is automatically saved (unless disabled in preferences).

### View History
1. Open Raycast
2. Type: `History`
3. Browse your saved prompts

### History Actions
- **Copy Enhanced**: `⌘ + C`
- **Copy Original**: `⌘ + Shift + C`
- **Paste**: `⌘ + V`
- **Export JSON**: `⌘ + J`
- **Delete**: `⌘ + Backspace`

## ⚡ Keyboard Shortcuts

Master these shortcuts for maximum efficiency:

### Primary Commands
| Action | Shortcut | Notes |
|--------|----------|-------|
| General Enhancement | Set in Raycast | Assign your preferred hotkey |
| Image Enhancement | Set in Raycast | Recommend `⌘ + Shift + I` |
| Code Enhancement | Set in Raycast | Recommend `⌘ + Shift + C` |
| History | Set in Raycast | Recommend `⌘ + Shift + H` |

### Within Commands
| Action | Shortcut | Context |
|--------|----------|---------|
| Copy Enhanced | `⌘ + C` | In preview |
| Copy Original | `⌘ + Shift + C` | In preview |
| Paste Enhanced | `⌘ + V` | In preview |
| Export JSON | `⌘ + J` | In preview/history |
| Save to History | `⌘ + S` | In preview |

## 🎯 Pro Tips for Better Results

### 1. Be Specific in Your Input
❌ **Vague**: "Write something"
✅ **Better**: "Write a blog post about remote work productivity"

### 2. Use the Right Preset
- **Articles/Content** → General
- **Visual Content** → Images  
- **Programming** → Code

### 3. Iterate and Refine
- Run enhancement multiple times with different inputs
- Use the enhanced prompt as input for further refinement
- Combine outputs from different presets

### 4. Leverage History
- Review past enhancements for inspiration
- Export successful prompts as templates
- Build a personal library of effective prompts

## 🔧 Quick Troubleshooting

### Command Not Working?
1. Check Ollama is running: `ollama serve`
2. Verify model is installed: `ollama list`
3. Copy text to clipboard first

### Slow Performance?
1. Try a smaller model: `llama3.2:3b`
2. Close memory-intensive apps
3. Check system resources

### Poor Results?
1. Be more specific in your input
2. Try a different preset
3. Use a larger model for complex tasks

## 🎊 What's Next?

You're now ready to use Promptify effectively! Here's what to explore next:

1. **[User Guide](03-user-guide.md)** - Detailed feature walkthrough
2. **[Presets Guide](04-presets-guide.md)** - Deep dive into each preset type
3. **[Customization](09-customization.md)** - Advanced configuration options

## 💡 Real-World Examples

### Content Creator
```
Input: "Instagram post about morning routine"
Preset: General
Result: Structured post with hooks, value, and CTAs
```

### Designer
```
Input: "Modern website hero section"
Preset: Images
Result: Detailed visual specifications for design tools
```

### Developer
```
Input: "API endpoint for user authentication"
Preset: Code
Result: Complete technical specification with security considerations
```

---

**Ready to dive deeper?** Check out the [Complete User Guide](03-user-guide.md) for advanced features and techniques!
