# iOS Shortcut: Capture Thought (with Dictation)

This iOS Shortcut enables you to capture thoughts via dictation using your iPhone's Action Button.

## Setup Instructions

### 1. Create the Shortcut

1. Open the **Shortcuts** app on your iPhone
2. Tap the **"+"** to create a new shortcut
3. Name it **"Capture Thought"**

### 2. Add Actions (in this order):

#### Action 1: Get Text from Input
- Search for and add **"Get Text from Input"**
- Set **Input Type** to **"Spoken Text"**
- Enable **"Allow Multiple Lines"**
- This will prompt for dictation when the shortcut runs

#### Action 2: Set Variable
- Add **"Set variable"** action
- Name the variable: **"UserInput"**
- This stores the dictated text

#### Action 3: Get Contents of URL (Draft)
- Add **"Get Contents of URL"** action
- **URL**: `http://YOUR_SERVER_IP:3000/draft`
  - Replace `YOUR_SERVER_IP` with your actual server IP (find with `ifconfig` on Mac)
  - If testing locally: `http://192.168.1.XXX:3000/draft`
- **Method**: `POST`
- **Headers**:
  - `Content-Type`: `application/json`
- **Request Body** (JSON):
```json
{
  "text": "[UserInput variable]",
  "context": "dictation"
}
```

#### Action 4: Get Dictionary from Input
- Add **"Get Dictionary from Input"** action
- This parses the JSON response from the AI classification

#### Action 5: Get Dictionary Value (multiple times)
Add these **"Get Dictionary Value"** actions to extract AI suggestions:

- **Get Dictionary Value**: Key = `classification.title` → Variable: `AITitle`
- **Get Dictionary Value**: Key = `classification.description` → Variable: `AIDescription`  
- **Get Dictionary Value**: Key = `classification.type` → Variable: `AIType`
- **Get Dictionary Value**: Key = `classification.priority` → Variable: `AIPriority`
- **Get Dictionary Value**: Key = `classification.category` → Variable: `AICategory`

#### Action 6: Choose from Menu
- Add **"Choose from Menu"** action
- Set **Prompt**: "Review AI suggestions:"
- **Menu Items**:
  - **"Save as Suggested"** 
  - **"Edit Before Saving"**

#### For "Save as Suggested":
- Add **"Get Contents of URL"** action
- **URL**: `http://YOUR_SERVER_IP:3000/create`
- **Method**: `POST`
- **Headers**: `Content-Type`: `application/json`
- **Request Body**:
```json
{
  "title": "[AITitle]",
  "description": "[AIDescription]", 
  "type": "[AIType]",
  "priority": "[AIPriority]",
  "category": "[AICategory]"
}
```

#### For "Edit Before Saving":
- Add **"Ask for Input"** actions for each field:
  - **Ask for Input** (Text): Prompt = "Title:" Default = `[AITitle]` → Variable: `FinalTitle`
  - **Ask for Input** (Text): Prompt = "Description:" Default = `[AIDescription]` → Variable: `FinalDescription`
  - **Choose from Menu**: Prompt = "Type:" Items = `Task, Idea, Concern, Decision, Question, Note` → Variable: `FinalType`
  - **Choose from Menu**: Prompt = "Priority:" Items = `Urgent, High, Medium, Low` → Variable: `FinalPriority` 
  - **Choose from Menu**: Prompt = "Category:" Items = `Work, Personal` → Variable: `FinalCategory`

- Then add **"Get Contents of URL"** with the final values

#### Action 7: Show Notification
- Add **"Show Notification"** action
- **Title**: "Thought Captured!"
- **Body**: "Successfully saved to Notion"

### 3. Configure Action Button

1. Go to **Settings > Action Button**
2. Select **"Shortcut"**
3. Choose **"Capture Thought"**

### 4. Test

1. Press and hold your **Action Button**
2. Speak your thought when prompted
3. Review AI suggestions and save

## Notes

- Make sure your server is running (`./start.sh`)
- Replace `YOUR_SERVER_IP` with your actual network IP
- The shortcut works on WiFi when your iPhone and Mac are on the same network
- For remote access, you'd need to expose your server publicly (not recommended for testing)

## Troubleshooting

- **"Could not connect"**: Check if server is running and IP is correct
- **"Network error"**: Ensure iPhone and Mac are on same WiFi
- **"Dictation failed"**: Check microphone permissions for Shortcuts app 