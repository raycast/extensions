import { Detail } from "@raycast/api";

export default function Command() {
  const markdown = `
# 🎨 Whimsical AI Diagram Generator

Transform your ideas into beautiful visual diagrams using AI! This extension intelligently creates flowcharts, mindmaps, and sequence diagrams from your natural language descriptions.

## ✨ How It Works

The AI automatically chooses the best diagram type based on your description:

- **🔄 Flowcharts** - For processes, workflows, decision trees, step-by-step procedures
- **🧠 Mindmaps** - For brainstorming, organizing ideas, exploring topics and concepts  
- **📊 Sequence Diagrams** - For system interactions, API flows, communication patterns

## 🚀 Quick Start Guide

1. **Open Raycast AI Chat** (⌘ + Space, then type "AI")
2. **Select "Whimsical Diagram" tool** from the available tools
3. **Describe what you want to visualize:**
   - "Create a user onboarding process"
   - "Brainstorm marketing strategies for a new app"
   - "Show the API flow for user authentication"
4. **Get your diagram!** The AI will generate and render it instantly

## 💡 Example Prompts

**For Flowcharts:**
- "Design a customer support ticket resolution process"
- "Map out the software deployment workflow"
- "Create a decision tree for choosing a programming language"

**For Mindmaps:**
- "Explore different revenue models for SaaS businesses"
- "Organize project management best practices"
- "Break down the components of effective teamwork"

**For Sequence Diagrams:**
- "Show how a mobile app handles user login"
- "Diagram the checkout process for an e-commerce site"
- "Map the communication flow in a microservices architecture"

## 🎯 Tips for Best Results

- **Be specific** - Include key steps, components, or participants
- **Use action words** - "process", "flow", "interaction", "strategy"
- **Mention context** - What domain or industry is this for?

**✨ No setup required** - Uses Raycast AI and Whimsical's rendering API seamlessly!
  `;

  return <Detail markdown={markdown} />;
}
