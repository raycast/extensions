# Capture Thought - Project Summary

## 🎯 What We Built

A complete **Raycast extension** that captures thoughts from anywhere on macOS, uses **AI to classify them**, and stores them in a **structured Notion database** for prioritized retrieval.

## 📁 Project Structure

```
capture-thought/
├── 📋 plan.md                    # Original specification document
├── 📖 README.md                  # Complete setup and usage guide
├── 🚀 start.sh                   # Quick start script (executable)
├── ✅ validate-setup.js           # Setup validation script
├── ⚙️ config.example              # Environment template
├── 📦 package.json               # Raycast extension configuration
├── 🔧 tsconfig.json              # TypeScript configuration
│
├── 🧠 assets/
│   └── brain.png                 # Extension icon (placeholder)
│
├── 💻 src/                       # Raycast Extension Source
│   ├── types.ts                  # TypeScript interfaces
│   ├── api.ts                    # Backend API integration
│   ├── capture-thought.tsx       # Main capture command
│   ├── capture-dictation.tsx     # Dictation capture command
│   ├── top-work-priorities.tsx   # Work priorities view
│   ├── top-life-priorities.tsx   # Personal priorities view
│   └── top-priorities-all.tsx    # All priorities view
│
└── 🖥️ server/                    # Backend Server
    ├── package.json              # Server dependencies
    ├── tsconfig.json             # Server TypeScript config
    └── src/
        └── server.ts             # Express server with AI & Notion
```

## 🏗️ Architecture Overview

### Frontend (Raycast Extension)
- **5 Commands**: Capture (clipboard/selection), Capture (dictation), and 3 priority views
- **React + TypeScript**: Modern UI with form validation
- **Smart Input Detection**: Clipboard vs selection detection
- **Configurable Server URL**: Easy local/production switching

### Backend (Express Server)
- **3 API Endpoints**: `/draft` (AI), `/create` (Notion), `/priorities` (retrieval)
- **OpenAI GPT-4 Integration**: Intelligent thought classification
- **Notion API Integration**: Structured database operations
- **Error Handling & Validation**: Robust request processing

### Data Flow
```
Input Source → Raycast → AI Classification → User Review → Notion Storage
     ↓              ↓            ↓              ↓           ↑
 Clipboard/    Express API   GPT-4 Analysis  Form UI   Database
 Selection/      Server      Type/Priority   Edit      with Health
 Dictation                   Category                   Formula
```

## 🔧 Key Components

### 1. AI Classification System
- **Smart Type Detection**: Task vs Idea vs Concern vs Decision vs Question vs Note
- **Priority Assessment**: Urgent → High → Medium → Low based on time sensitivity  
- **Category Classification**: Work vs Personal (detects keywords like "doctor", "grocery")
- **Title Optimization**: Imperative form for tasks, descriptive for ideas
- **Fallback Handling**: Graceful degradation when AI fails

### 2. Notion Database Schema
```
Properties:
├── Name (Title) - AI-generated summary
├── Type (Select) - Task/Idea/Concern/Decision/Question/Note
├── Priority (Select) - Urgent/High/Medium/Low
├── Category (Select) - Work/Personal
├── Due Date (Date) - Optional
├── Status (Select) - To Do/In Progress/Completed
├── Created (Created time) - Auto-populated
├── Description (Text) - Full thought content
└── Health (Formula) - Custom prioritization scoring
```

### 3. Priority Retrieval System
- **Health-Based Sorting**: Uses custom Notion formula for prioritization
- **Category Filtering**: Separate work/personal/all views
- **Top 3 Results**: Focused high-impact display
- **Rich Metadata**: Health score, creation date, priority indicators

## 💡 AI Classification Logic

The system uses GPT-4 with carefully crafted prompts to:

1. **Analyze Context**: Considers input source (clipboard/selection/dictation)
2. **Classify Type**: Based on actionability and content nature
3. **Assess Priority**: Time sensitivity and urgency indicators
4. **Determine Category**: Work vs personal context clues
5. **Generate Title**: Proper formatting based on type
6. **Expand Description**: Additional context and details

## 🔌 API Interface

### POST /draft - AI Classification
```json
Request: { "text": "...", "context": "clipboard|selection|dictation" }
Response: { "classification": { "title": "...", "type": "...", ... } }
```

### POST /create - Notion Storage
```json
Request: { "title": "...", "description": "...", "type": "...", ... }
Response: { "success": true, "id": "notion-page-id" }
```

### GET /priorities - Retrieval
```
/priorities?category=work     → Work priorities
/priorities?category=personal → Personal priorities  
/priorities                   → All priorities
```

## 🚀 Getting Started

### Quick Start (One Command)
```bash
./start.sh
```

### Manual Setup
1. **Dependencies**: `npm install` (root) + `cd server && npm install`
2. **Configuration**: Copy `config.example` to `server/.env` and add API keys
3. **Notion Setup**: Create database with specified schema
4. **Start Server**: `cd server && npm run dev`
5. **Start Extension**: `npm run dev`

### Validation
```bash
node validate-setup.js
```

## 🎯 Extension Commands

1. **Capture Thought (Clipboard/Selection)**
   - Auto-detects input source
   - Instant AI analysis
   - Pre-filled editable form

2. **Capture Thought (Dictate)**  
   - Manual text input
   - Dictation support (Fn+Fn)
   - Two-step: input → analyze → save

3. **Top Work Priorities**
   - Work category filter
   - Health-sorted display
   - Quick Notion access

4. **Top Life Priorities**
   - Personal category filter
   - Health-sorted display
   - Focus on personal goals

5. **Top Priorities (All)**
   - Cross-category view
   - Combined prioritization
   - Comprehensive overview

## 🔮 AI Prompt Engineering

The system uses sophisticated prompts that:
- Define clear classification rules
- Provide context about input source
- Enforce structured JSON responses
- Include validation and fallback logic
- Optimize for consistent results

## 📊 Health Formula Integration

The Notion database can include a custom Health formula like:
```
if(prop("Status") == "Completed", 0, 
  if(prop("Priority") == "Urgent", 100,
    if(prop("Priority") == "High", 75,
      if(prop("Priority") == "Medium", 50, 25)
    )
  ) - dateBetween(now(), prop("Created"), "days") * 2
)
```

This scores items based on priority and time decay.

## 🎨 User Experience Features

- **Instant Feedback**: Toast notifications for all operations
- **Smart Defaults**: AI pre-fills with intelligent suggestions
- **Flexible Editing**: All fields remain editable before saving
- **Visual Indicators**: Priority icons, health scores, time stamps
- **Quick Actions**: Copy titles, open in Notion, keyboard shortcuts
- **Error Handling**: Graceful failures with helpful messages

## 🔧 Technical Highlights

- **TypeScript Throughout**: Full type safety and IntelliSense
- **Modern React Patterns**: Hooks, functional components, proper state management
- **Robust Error Handling**: Network failures, API errors, validation issues  
- **Environment Configuration**: Easy local/production switching
- **Security**: API keys in environment variables only
- **Performance**: Efficient API calls, proper loading states
- **Extensibility**: Modular architecture for easy feature additions

## 📈 Scalability Considerations

- **Server Deployment**: Ready for Railway, Vercel, Heroku
- **API Rate Limits**: Built-in error handling for OpenAI/Notion limits
- **Database Growth**: Notion handles large datasets efficiently
- **User Management**: Single-user by design, but extensible
- **Feature Expansion**: Easy to add new thought types, properties, commands

## 🎉 Ready to Use!

The extension is complete and ready for:
1. ✅ Local development and testing
2. ✅ Production server deployment  
3. ✅ Raycast Store submission
4. ✅ Daily productivity use

Run `./start.sh` to begin capturing your thoughts! 🧠✨ 