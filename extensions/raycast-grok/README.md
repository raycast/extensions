# 🚀 Raycast Grok Extension

> A powerful AI assistant extension that brings Grok AI directly to your fingertips through Raycast's elegant interface.

![Grok Extension](assets/grok-light.png)

## ✨ Why Raycast Over Web Interfaces?

**Raycast** revolutionizes how we interact with applications by providing a unified, lightning-fast command palette that eliminates the friction of traditional web interfaces:

- **⚡ Instant Access**: Launch any command with a simple keystroke (`⌘ Space`) - no need to open browsers or navigate through web pages
- **🎯 Context-Aware**: Seamlessly work with selected text, clipboard content, and screen captures without manual copy-pasting
- **🔄 Native Integration**: Deep system integration allows for smooth workflows between different apps and tools
- **💨 Zero Loading Time**: Native performance means instant responses, unlike web interfaces that require page loads
- **🎨 Consistent UX**: Unified interface design across all tools maintains your flow state
- **⌨️ Keyboard-First**: Designed for power users who prefer keyboard shortcuts over mouse navigation
- **📱 Always Available**: System-wide accessibility means your AI assistant is just one shortcut away, regardless of what you're working on

## 🧠 Why Grok AI?

**Grok AI** stands out in the crowded AI landscape for several compelling reasons:

### 🎭 Authentic AI Personality

According to Elon Musk's vision, Grok AI maintains its natural personality without artificial intervention or heavy-handed content moderation. This means:

- **🚫 No Political Correctness Filters**: Grok provides honest, unfiltered responses without being constrained by excessive political correctness
- **🎯 Genuine Interactions**: The AI's responses feel more authentic and human-like, as they aren't artificially sanitized
- **💭 Natural Reasoning**: Grok thinks and responds in a more natural way, closer to how humans actually process information

### 🔧 Technical Excellence

- **🌟 State-of-the-Art Models**: Access to cutting-edge models including Grok-4, Grok-3-Beta, and specialized vision models
- **👁️ Multimodal Capabilities**: Advanced image understanding and analysis capabilities
- **⚡ Real-Time Processing**: Fast response times with streaming capabilities
- **🎨 Versatile Applications**: From text analysis to image understanding, translation to code explanation

### 🆓 Accessibility

- **💰 Cost-Effective**: More accessible pricing compared to some competitors
- **🔓 Open Philosophy**: Aligned with principles of open AI development and reduced censorship

## 🛠️ Features & Use Cases

This extension provides **9 powerful commands** that cover a wide range of AI-assisted workflows:

### 1. 💬 **Ask AI**

- **Purpose**: General-purpose AI conversation and query handling
- **Use Cases**:
  - Get answers to complex questions
  - Brainstorm ideas and solutions
  - Analyze problems and get recommendations
  - Code review and programming assistance
- **Models Available**: Grok-3-Beta, Grok-3-Mini-Beta, Grok-2-1212
- **Usage**: `⌘ Space` → Type "Ask AI" → Enter your question

### 2. 📖 **History**

- **Purpose**: View and manage your chat history with Grok AI
- **Use Cases**:
  - Review previous conversations
  - Copy responses or prompts for reuse
  - Track your AI interaction patterns
  - Clear history when needed
- **Features**: Searchable history, copy functionality, timestamp tracking

### 3. 🌐 **Translate**

- **Purpose**: Intelligent bidirectional translation between English and Chinese
- **Use Cases**:
  - Translate selected text instantly
  - Work with multilingual documents
  - Communicate across language barriers
  - Learn new languages through context
- **Smart Detection**: Automatically detects source language and translates accordingly

### 4. 📚 **Lookup**

- **Purpose**: Dictionary and reference lookup functionality
- **Use Cases**:
  - Define unfamiliar words or terms
  - Get detailed explanations of concepts
  - Understand technical jargon
  - Expand vocabulary and knowledge

### 5. 💡 **Explain It**

- **Purpose**: Detailed explanations of complex topics or selected text
- **Use Cases**:
  - Understand difficult concepts
  - Break down complex code or documentation
  - Get simplified explanations of technical topics
  - Educational assistance and learning support

### 6. 📄 **Summarize Site**

- **Purpose**: Intelligent webpage content summarization
- **Use Cases**:
  - Quickly understand long articles
  - Extract key points from research papers
  - Get meeting notes from lengthy documents
  - Save time on information consumption
- **Features**: Structured summaries with key points, target audience analysis, and actionable insights

### 7. 🖼️ **Ask About Selected Screen Area**

- **Purpose**: AI-powered analysis of screenshots and visual content
- **Use Cases**:
  - Analyze UI/UX designs
  - Get help with error messages or dialogs
  - Understand charts, graphs, and diagrams
  - Accessibility assistance for visual content
- **Vision Models**: Grok-4, Grok-2-Vision-1212, Grok-Beta, Grok-Vision-2
- **Smart Capture**: Automatically captures selected screen areas

### 8. 📝 **Ask About Selected Text**

- **Purpose**: Context-aware analysis of selected or clipboard text
- **Use Cases**:
  - Analyze code snippets
  - Get explanations of selected paragraphs
  - Quick fact-checking and verification
  - Context-sensitive help and guidance
- **Smart Text Acquisition**: Works with both selected text and clipboard content

### 9. 📰 **Solidot Daily**

- **Purpose**: Automated daily tech news summaries from Solidot.org using Grok AI
- **Use Cases**:
  - Stay updated with Chinese tech news
  - Get AI-categorized news summaries by industry
  - Track technology trends over time
  - Save time on news consumption
- **Features**:
  - **📅 Smart Date Management**: Automatically processes the last 15 days (excluding today)
  - **🔄 Automatic Generation**: Checks for missing summaries and generates them on-demand
  - **🏷️ Industry Categorization**: AI-powered categorization by tech sectors (AI, Hardware, Software, Security, etc.)
  - **💾 Local Storage**: Summaries stored locally with automatic cleanup (maintains 15 most recent)
  - **🚫 Deduplication**: Prevents regenerating existing summaries
  - **⚡ One-Click Updates**: Easy regeneration and management of summaries
- **Workflow**:
  1. Fetches RSS feed from Solidot.org
  2. Groups news by date (last 15 days)
  3. Uses Grok AI to categorize and summarize each day's news
  4. Stores summaries locally with smart cleanup
- **Shortcuts**:
  - `⌘R`: Check and generate missing summaries
  - `⌘G`: Regenerate specific day's summary
  - `⌘D`: Delete summary

## 🔧 Technology Stack

This extension is built using modern web technologies and Raycast's powerful API:

### **Frontend Framework**

- **⚛️ React 19.1.1**: Latest React with concurrent features and improved performance
- **📘 TypeScript 5.9.2**: Full type safety and enhanced developer experience
- **🎨 Raycast API 1.102.5**: Native Raycast integration for seamless UX

### **AI Integration**

- **🤖 OpenAI SDK 4.104.0**: Robust API client for Grok AI communication
- **🔄 Streaming Responses**: Real-time response streaming for better UX
- **🎯 Multiple Model Support**: Access to various Grok models for different use cases

### **Development Tools**

- **⚡ Vite 6.3.5**: Lightning-fast build tool and development server
- **🧪 Vitest 3.2.4**: Modern testing framework with coverage support
- **🔍 ESLint 9.34.0**: Code quality and consistency enforcement
- **💅 Prettier 3.6.2**: Automated code formatting

### **Utilities & Hooks**

- **🪝 usehooks-ts 3.1.1**: Collection of useful React hooks
- **🛠️ Raycast Utils 1.19.1**: Additional utilities for Raycast development
- **📦 Custom Hooks**: `useGrok` for AI integration, `useChatHistory` for state management

### **Build & Deployment**

- **📦 Package Management**: Support for both npm and pnpm
- **🔨 Build Pipeline**: Automated building with ray CLI
- **🚀 Publishing**: Direct publishing to Raycast Store
- **🧹 Code Quality**: Husky pre-commit hooks with lint-staged

## 🚀 Getting Started

### Prerequisites

- **Raycast**: Install from [raycast.com](https://raycast.com)
- **Grok AI API Key**: Obtain from xAI platform

### Installation

1. Clone this repository
2. Install dependencies: `npm install` or `pnpm install`
3. Configure your Grok AI API key in Raycast preferences
4. Build the extension: `npm run build`
5. Install in Raycast: `npm run dev`

### Configuration

- Set your **Grok AI API Key** in the extension preferences
- Choose your preferred **default model** (Grok-3-Mini-Beta recommended for general use)
- Customize **system prompts** for different commands if needed

## 🎯 Usage Tips

- **⌨️ Keyboard Shortcuts**: Learn the shortcuts for frequently used commands
- **📋 Text Selection**: Select text before launching commands for context-aware responses
- **🖼️ Screen Capture**: Use the screen area selection for visual analysis
- **📚 History**: Leverage the history feature to build on previous conversations
- **🎛️ Model Selection**: Choose appropriate models based on your task (vision models for images, text models for conversations)

## 🤝 Contributing

This project was developed as part of the TEK AI Competition. Contributions, suggestions, and feedback are welcome!

## 📄 License

See [LICENSE.md](LICENSE.md) for details.

---

_Built with ❤️ using Raycast API and Grok AI_
