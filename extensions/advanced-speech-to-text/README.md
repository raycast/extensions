# Advanced Speech to Text Extension for Raycast

A powerful and easy-to-use extension for Raycast that converts voice to text using OpenAI's most advanced models, including GPT-4o-transcribe.

## ✨ Key Features

- **Instant Recording**: Starts recording immediately when opening the extension
- **Automatic Transcription**: Automatically transcribes when you stop recording
- **Smart Formatting**: Converts your text to different formats (Email, Slack, Report)
- **Customizable Prompts**: Configure custom prompts for each type of format
- **Multiple Models**: Support for Whisper-1 and GPT-4o Transcribe
- **99+ Languages**: Auto-detection or manual language selection
- **History**: Save and manage your recording history

## 🚀 Available Commands

### Dictate

- **Function**: Instant recording with automatic transcription
- **Usage**: Opens directly in recording mode, press Enter to stop and transcribe

### Recording History

- **Function**: View and manage recording history
- **Usage**: Search, copy or delete previous transcriptions

## ⚙️ Configuration

### Basic Configuration

- **OpenAI API Key**: Your OpenAI API key (required)
- **Model**: Select between Whisper-1 or GPT-4o Transcribe (Recommended)
- **Language**: Auto-detection or manual selection
- **Temperature**: Controls the creativity of transcription
- **Response Format**: Text, JSON, SRT or VTT

### 🎯 Customizable Prompts (NEW)

You can now fully customize the prompts for each type of format:

#### Custom Email Prompt

- **Purpose**: Define how to format transcriptions as professional emails
- **Default prompt**:
  ```
  Transform the following text into a professional and well-structured email.
  Add an appropriate greeting, organize the information in clear paragraphs, and end with a professional closing.
  Maintain a formal but friendly tone. Only return the email text, without subject.
  ```

#### Custom Slack Prompt

- **Purpose**: Define how to format transcriptions for Slack messages
- **Default prompt**:
  ```
  Transform the following text into an informal Slack message.
  Make it conversational, direct and easy to read. Use emojis if appropriate and maintain a casual but professional tone.
  Organize the information clearly and concisely.
  ```

#### Custom Report Prompt

- **Purpose**: Define how to format transcriptions as structured reports
- **Default prompt**:

  ```
  Transform the following text into a structured report for a task management system.
  Organize the information with:
  - **Objective/Task:** [clear description of what needs to be done]
  - **Details:** [specific information and steps if any]
  - **Requirements:** [if applicable, what is needed to complete the task]

  Maintain a clear, professional and action-oriented format.
  ```

### 📝 Custom Prompt Examples

#### For More Creative Emails:

```
Convert the following text into a creative and persuasive email.
Use a friendly but professional tone, include an eye-catching introduction
and end with a clear call to action. Organize the information in a way
that is easy to read and convincing.
```

#### For Slack with Specific Style:

```
Transform this text into a Slack message for a development team.
Use appropriate technical terminology, maintain a direct and collaborative tone.
Include relevant development emojis (🚀 ✅ 🔧 etc.) and structure
the information to facilitate quick responses.
```

#### For Project Reports:

```
Convert this text into a project status report with the following sections:
- **Executive Summary:** [brief overview of status]
- **Current Progress:** [what has been completed]
- **Next Steps:** [planned actions]
- **Blockers:** [if any]
- **Delivery Date:** [estimation if relevant]
```

## 🎮 Workflow

1. **Open "Dictate"** - Recording starts automatically
2. **Speak clearly** - Say your message
3. **Press Enter** to stop and transcribe, or select a specific format (Email, Slack, Report)
4. **Result handling**:
   - If using default format: Text is automatically pasted into the currently selected text field
   - If using specific format (Email/Slack/Report): Review the formatted result and press Enter to paste

## 🚀 Setup & Installation

### Prerequisites

Before installing the extension, you need to set up the following requirements:

#### 1. Install SoX (Audio Processing Library)

This extension requires SoX for audio recording functionality. Choose one of these installation methods:

**Option A: Using Homebrew (Recommended)**

```bash
brew install sox
```

**Option B: Using MacPorts**

```bash
sudo port install sox
```

**Option C: Download from Official Website**

- Visit [SoX Official Website](https://sox.sourceforge.net/)
- Download and install the macOS version

**Verify Installation:**

```bash
sox --version
```

#### 2. Get Your OpenAI API Key

**🔒 Privacy Note: Your API key never leaves your computer. All communication is direct between your device and OpenAI's servers.**

1. **Create OpenAI Account**

   - Go to [OpenAI Platform](https://platform.openai.com/)
   - Sign up or log in to your account

2. **Generate API Key**

   - Navigate to [API Keys section](https://platform.openai.com/api-keys)
   - Click "Create new secret key"
   - Copy the generated key (you won't see it again!)

3. **Add Credits (if needed)**
   - Go to [Billing](https://platform.openai.com/account/billing)
   - Add payment method and credits as needed

### Installation Steps

1. **Install Extension**

   - Open Raycast
   - Search for "Store"
   - Install "Advanced Speech to Text"

2. **Configure API Key**

   - Open Raycast Preferences
   - Navigate to Extensions → Advanced Speech to Text
   - Paste your OpenAI API Key in the "OpenAI API Key" field

3. **Customize Settings (Optional)**

   - Select your preferred Whisper model
   - Choose default language or keep auto-detection
   - Adjust temperature and response format as needed

4. **Test the Extension**
   - Open Raycast and search "Dictate"
   - Grant microphone permissions when prompted
   - Start your first recording!

### 🎨 Custom Prompt Configuration

You can fully customize how your transcriptions are formatted for different use cases:

#### Accessing Custom Prompts

1. Open Raycast Preferences
2. Go to Extensions → Speech to Text
3. Scroll down to find these customizable prompt fields:
   - **Custom Email Prompt**
   - **Custom Slack Prompt**
   - **Custom Report Prompt**

#### How to Customize Prompts

**Example: Professional Email Style**

```
Transform the following text into a formal business email.
Use professional language, include proper salutations,
organize content in clear paragraphs, and end with
appropriate closing remarks. Maintain executive-level tone.
```

**Example: Creative Slack Messages**

```
Convert this text into an engaging Slack message for a marketing team.
Use relevant emojis, maintain enthusiastic but professional tone,
include call-to-action elements, and format for easy readability.
Add appropriate marketing terminology where relevant.
```

**Example: Technical Documentation**

```
Transform this into technical documentation format with:
- **Overview:** Brief summary
- **Implementation:** Detailed steps
- **Requirements:** Technical dependencies
- **Notes:** Important considerations
Use developer-friendly language and markdown formatting.
```

#### Prompt Customization Tips

- **Be Specific**: Include exact formatting requirements
- **Set Tone**: Specify formal, casual, technical, creative, etc.
- **Include Examples**: Reference specific terminology or style
- **Define Structure**: Outline how information should be organized
- **Test & Iterate**: Try different prompts to find what works best

## 🔧 Requirements

- **macOS**: Compatible macOS version
- **SoX**: Audio processing library (see installation above)
- **Raycast**: Latest version recommended
- **OpenAI API Key**: Active account with available credits
- **Microphone**: Working microphone with system permissions
- **Internet Connection**: For OpenAI API communication

## 💡 Usage Tips

- **For better results**: Speak clearly in a low-noise environment
- **Languages**: Auto-detection works very well, but you can specify the language for greater accuracy
- **Custom prompts**: Experiment with different prompts to adapt the format to your specific needs
- **History**: Use the "Recording History" command to review and reuse previous transcriptions

## 🆘 Troubleshooting

- **API Error**: Verify that your OpenAI key is valid and has credits
- **Not recording**: Check microphone permissions in System Settings
- **Incorrect transcription**: Try with specific language instead of auto-detection
- **Unwanted format**: Adjust custom prompts in preferences

## 📞 Support

If you have problems or suggestions, you can:

- Review the configuration documentation in Raycast
- Verify that your OpenAI API key is configured correctly
- Try different model and temperature settings

---

Enjoy using this extension to convert your voice to text efficiently! 🎤✨
