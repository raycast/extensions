# History Management Guide

Learn how to effectively manage, search, and reuse your enhanced prompts with Promptify's powerful history system.

## 📚 Overview

Promptify automatically saves every enhanced prompt to your local history (unless disabled), creating a valuable library of effective prompts you can reuse and reference.

### Key Features
- **Automatic Saving**: Every enhancement is saved by default
- **Local Storage**: All data stays on your machine via Raycast's LocalStorage
- **Rich Search**: Find prompts by content, preset type, or date
- **Export Options**: Individual or bulk export in JSON format
- **Smart Organization**: Chronological with metadata tracking

## 🎯 Accessing History

### Open History Command
1. **Via Raycast**: Type "History" and press Enter
2. **Via Keyboard**: Set a custom shortcut (recommended: `⌘ + Shift + H`)

### History Interface

The history view shows:
- **Original Text**: Your input prompt (truncated if long)
- **Preset Type**: General, Images, or Code with icons
- **Timestamp**: "5m ago", "2h ago", "3d ago" format
- **Character Count**: Length of enhanced output
- **Quick Actions**: Copy, paste, export, delete

## 🔍 Search and Filter

### Search Functionality
```
Search by:
- Original prompt text
- Enhanced output content  
- Preset type (general, images, code)
- Date range (coming in future updates)
```

### Search Tips
- **Partial Matches**: Search for "react" finds all React-related prompts
- **Case Insensitive**: "REACT", "react", "React" all work the same
- **Multiple Terms**: "react typescript" finds prompts containing both terms

### Filter Examples
```
"blog" → All blog-related prompts
"midjourney" → All image generation prompts
"api" → All API-related code prompts
"email campaign" → All email marketing prompts
```

## ⚡ Quick Actions

### Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| Copy Enhanced | `⌘ + C` | Copy the enhanced prompt |
| Copy Original | `⌘ + Shift + C` | Copy the original input |
| Paste Enhanced | `⌘ + V` | Paste to active app |
| Export JSON | `⌘ + J` | Copy as structured JSON |
| Export All (Bulk) | `⌘ + Shift + J` | Copy entire history as a single JSON export |
| Delete Item | `⌘ + Backspace` | Remove from history |
| Refresh | `⌘ + R` | Reload history list |

### Action Details

#### Copy Enhanced Prompt
- **Use Case**: Most common action - get the enhanced version
- **Behavior**: Copies full enhanced text to clipboard
- **Next Step**: Paste into your AI tool of choice

#### Copy Original Prompt  
- **Use Case**: Reference your original input or use as template
- **Behavior**: Copies the original text you enhanced
- **Next Step**: Modify and enhance again for variations

#### Paste Enhanced
- **Use Case**: Direct insertion into active application
- **Behavior**: Automatically switches to previous app and pastes
- **Requirements**: Must have an active text field in another app

#### Export as JSON
- **Use Case**: Backup, sharing, or integration with other tools
- **Format**: Structured data with metadata
- **Content**: Includes timestamps, settings, and performance data

## 📊 Export Formats

### Individual Export
```json
{
  "id": "hist_1694123456789_abc123",
  "timestamp": 1694123456789,
  "created": "2024-09-07T14:30:56.789Z",
  "preset": "general",
  "original": "Write about sustainable energy",
  "enhanced": "# 🎯 Objective\nCreate a comprehensive...",
  "metadata": {
    "provider": "ollama", 
    "model": "llama3.2:3b",
    "processingTime": 2341,
    "version": "1.0.0",
    "tool": "Promptify"
  }
}
```

### Bulk Export (All History)

The History view supports exporting the entire saved history as a single JSON payload. Use the **Export All as JSON** action (or press `⌘ + Shift + J`) to copy the full export to your clipboard. The export includes a top-level `metadata` block and a `history` array with each saved prompt.

Example bulk export format:

```json
{
  "metadata": {
    "exported_at": "2025-09-07T15:00:00Z",
    "tool": "Promptify",
    "version": "1.0.0",
    "total_items": 25
  },
  "history": [
    {
      "id": "hist_abc123",
      "timestamp": 1725715800000,
      "created": "2025-09-07T14:30:00.000Z",
      "preset": "general",
      "original": "Write about sustainable energy",
      "enhanced": "# 🎯 Objective\nCreate a comprehensive...",
      "metadata": {
        "provider": "ollama",
        "model": "llama3.2:3b",
        "processingTime": 2341,
        "original_length": 45,
        "enhanced_length": 520,
        "enhancement_ratio": "11.56"
      }
    }
    // ...more items
  ]
}
```

## 🗂️ Organization Strategies

### Naming Conventions
Since search is content-based, use descriptive inputs:

❌ **Vague**: "Write something"
✅ **Descriptive**: "Blog post about remote work productivity tips"

### Content Tagging
Include keywords in your original prompts:

❌ **Generic**: "Make an image"
✅ **Tagged**: "Midjourney prompt: professional headshot for LinkedIn"

### Project Organization
Group related prompts by project:

```
Project: Mobile App Launch
- "App landing page copy" → General
- "App store screenshots" → Images  
- "API documentation" → Code
```

### Workflow Templates
Save successful prompt patterns:

```
Template: Product Launch Email
1. "Email about [product] launch for [audience]"
2. Enhance with General preset
3. Use enhanced output as template
4. Modify specific details for each launch
```

## 📈 Usage Analytics

### Built-in Metadata
Each history item includes:
- **Processing Time**: How long enhancement took
- **Provider Used**: Which AI service processed it
- **Model Used**: Specific model version
- **Character Counts**: Input and output lengths

### Personal Analytics
Track your own patterns:
- **Most Used Presets**: Which preset type you use most
- **Successful Patterns**: Which prompts produce best results
- **Improvement Over Time**: How your prompting skills develop

### Performance Insights
```
Fast Processing (<2s): Simple prompts, small models
Medium Processing (2-10s): Complex prompts, standard models  
Slow Processing (>10s): Very complex prompts, large models
```

## 🔧 Configuration Options

### History Settings
Access via Raycast → Settings → Extensions → Promptify:

#### Save to History
- **Enabled**: Automatically save all enhancements (default)
- **Disabled**: Manual saving only

#### History Limit
#### History Limit
- **Default**: 50 items
- **Range**: 10-100 items
- **Behavior**: Oldest items removed when limit reached

#### Auto-cleanup
- **Feature**: Automatically remove old items
- **Options**: Never, 30 days, 90 days, 1 year
- **Status**: Coming in future update

### Storage Information
```
Location: Raycast LocalStorage (encrypted)
Size: ~1KB per prompt average (varies with prompt length and metadata)
Default (50 prompts) ≈ 50KB total storage (estimate)
Privacy: Never leaves your machine
```

## 🛠️ Management Operations

### Bulk Operations

#### Clear All History
1. Open History command
2. Use `⌘ + Shift + Backspace` shortcut
3. Confirm deletion in dialog
4. **Warning**: This action cannot be undone

#### Selective Deletion
```
Strategy 1: Search and delete
1. Search for specific term
2. Delete unwanted items individually

Strategy 2: Sort and clean
1. Browse chronologically  
2. Delete outdated items
3. Keep successful templates
```

### Backup Strategies

#### Manual Backup
```
1. Export successful prompts as JSON
2. Save to secure location (cloud storage, external drive)
3. Document templates and patterns
4. Include notes about what worked well
```

#### Automated Backup (Advanced)
```bash
# Script to backup Raycast LocalStorage (advanced users)
# Location varies by macOS version and Raycast installation
```

## 🔄 Migration and Sharing

### Export for Sharing
```
Use Case: Share successful prompts with team
1. Export individual prompts as JSON
2. Remove sensitive/personal information
3. Share via team communication tools
4. Document context and usage tips
```

### Import Patterns (Future)
```
Planned features:
- Import JSON files from other users
- Template marketplace
- Team libraries
- Cross-device sync
```

### Cross-Platform Considerations
```
Current: macOS/Raycast only
Future: Potential web version, mobile apps
Data format: JSON (portable and future-proof)
```

## 🎯 Best Practices

### Daily Workflow
```
Morning: Review yesterday's successful prompts
During work: Use history for similar tasks
Evening: Clean up unsuccessful attempts
Weekly: Export valuable templates
```

### Quality Curation
```
Keep: High-quality enhancements that work well
Archive: Experimental prompts that might be useful
Delete: Failed attempts or outdated content
Template: Successful patterns for reuse
```

### Performance Optimization
```
Regular cleanup: Remove old/unused items
Descriptive inputs: Make search more effective
Export valuable items: Backup before deletion
Monitor storage: Keep within reasonable limits
```

## 🚀 Advanced Tips

### Template Creation
```
1. Create a successful enhancement
2. Export as JSON for documentation
3. Use original text as template
4. Modify specifics for new use cases
5. Build personal prompt library
```

### Cross-Preset Workflows
```
Example: Product Documentation
1. General: "User guide for mobile app" → Structure
2. Images: "Screenshots for app tutorial" → Visuals
3. Code: "API documentation" → Technical details
```

### Integration with Other Tools
```
Notion: Paste enhanced prompts into project docs
Obsidian: Link prompts to project notes
Git: Include prompt templates in project repos
Slack: Share successful prompts with team
```

## 🔮 Future Enhancements

### Planned Features
- **Smart Search**: AI-powered semantic search
- **Categories**: Custom tagging and organization
- **Templates**: Built-in template system
- **Analytics**: Usage statistics and insights
- **Cloud Sync**: Cross-device synchronization
- **Collaboration**: Team sharing and libraries

### Community Features
- **Template Marketplace**: Share successful prompts
- **Preset Exchange**: Custom preset sharing
- **Success Stories**: Community examples and tips

---

**Next**: Dive into [Customization Options](09-customization.md) to personalize Promptify for your specific workflow!
