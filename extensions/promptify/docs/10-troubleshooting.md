# Troubleshooting Guide

This guide helps you diagnose and fix common issues with Promptify. Most problems can be resolved quickly with these solutions.

## 🚨 Common Issues

### 1. "AI provider is not available"

This is the most common issue and usually relates to Ollama configuration.

#### Quick Fix
```bash
# Check if Ollama is running
curl http://localhost:11434/api/version

# If not running, start Ollama
ollama serve
```

#### Detailed Diagnosis

**Step 1: Verify Ollama Installation**
```bash
# Check if Ollama is installed
ollama --version

# If not installed, download from https://ollama.ai
```

**Step 2: Check Ollama Service**
```bash
# Start Ollama service
ollama serve

# In another terminal, test connection
curl http://localhost:11434/api/version
```

**Step 3: Verify Model Installation**
```bash
# List installed models
ollama list

# If no models, install one
ollama pull llama3.2:3b
```

**Step 4: Check Promptify Settings**
1. Open Raycast → Settings → Extensions → Promptify
2. Verify:
   - Provider: "Ollama"
   - URL: "http://localhost:11434"
   - Model: matches an installed model

#### Advanced Solutions

**Custom Ollama URL**
If Ollama runs on a different port:
```bash
# Start on custom port
ollama serve --port 11435

# Update Promptify settings
# URL: http://localhost:11435
```

**Remote Ollama Instance**
```bash
# If Ollama runs on another machine
# URL: http://192.168.1.100:11434
```

**Firewall Issues**
```bash
# Check if port is blocked
sudo lsof -i :11434

# Allow through firewall (macOS)
sudo pfctl -f /etc/pf.conf
```

### 2. "No text found in clipboard"

#### Quick Fix
1. Copy some text to your clipboard first
2. Then run the Promptify command

#### Common Causes

**Empty Clipboard**
- Solution: Copy text before running command
- Verification: `⌘+V` in any app to check clipboard

**Clipboard Permissions**
1. System Preferences → Security & Privacy → Privacy
2. Select "Accessibility" 
3. Ensure Raycast has permission
4. Restart Raycast if needed

**Special Characters**
- Some special characters may not copy correctly
- Try copying simpler text first
- Check if text contains binary data

#### Advanced Solutions

**Clipboard Manager Conflicts**
```bash
# Disable other clipboard managers temporarily
# Common apps: ClipMenu, Paste, CopyClip
```

**System Clipboard Issues**
```bash
# Clear clipboard and test
pbcopy < /dev/null
echo "test text" | pbcopy
# Try Promptify again
```

### 3. Slow Performance

#### Quick Fixes

**Use Smaller Model**
```bash
# Switch to faster model
ollama pull llama3.2:3b

# Update in Promptify settings:
# Model: llama3.2:3b
```

**Close Memory-Intensive Apps**
- Check Activity Monitor for high memory usage
- Close unnecessary applications
- Restart if memory is fragmented

#### Performance Optimization

**Model Comparison**
| Model | Speed | Quality | RAM Required |
|-------|-------|---------|--------------|
| `llama3.2:3b` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 4GB |
| `llama3.1:8b` | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 8GB |
| `mistral:7b` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 6GB |

**System Optimization**
```bash
# Check available RAM
vm_stat

# Check CPU usage
top -l 1 | grep "CPU usage"

# Check disk space
df -h
```

**Network Issues** (if using remote Ollama)
```bash
# Test network speed to Ollama server
ping your-ollama-server

# Check network latency
curl -w "%{time_total}" http://your-ollama-server/api/version
```

### 4. Poor Enhancement Quality

#### Common Causes

**Vague Input**
❌ Bad: "Write something"
✅ Good: "Write a blog post about sustainable energy for general readers"

**Wrong Preset**
- Use **General** for content/writing
- Use **Images** for visual prompts
- Use **Code** for technical tasks

**Model Limitations**
- Smaller models (3B) have limited capabilities
- Try larger models for complex tasks
- Consider specific models (e.g., CodeLlama for programming)

#### Improvement Strategies

**Better Input Examples**
```
❌ "Make an image"
✅ "Create a professional headshot photo for LinkedIn profile"

❌ "Help with code"  
✅ "Create a React component for user authentication with TypeScript"

❌ "Write article"
✅ "Write a 1000-word guide about remote work productivity for freelancers"
```

**Model Selection**
```bash
# For complex tasks
ollama pull llama3.1:8b

# For code-specific tasks
ollama pull codellama:7b

# For balanced performance
ollama pull mistral:7b
```

### 5. History Not Saving

#### Quick Diagnosis
1. Check Promptify settings
2. Verify "Save to History" is enabled
3. Check if history limit is reached

#### Solutions

**Settings Check**
1. Raycast → Settings → Extensions → Promptify
2. Ensure "Save to History" is checked
3. Check history limit (default: 100)

**Storage Issues**
```bash
# Check Raycast storage (LocalStorage)
# Usually resolved by restarting Raycast
```

**Clear Corrupted History**
1. Open Raycast
2. Type "History" 
3. Use "Clear All History" if data seems corrupted

### 6. Commands Not Appearing

#### Quick Fix
```bash
# Rebuild extension
cd /path/to/promptify
npm run build

# Restart Raycast
```

#### Common Causes

**Extension Not Installed**
1. Check Raycast → Settings → Extensions
2. Look for "Promptify" in the list
3. If missing, reinstall from Raycast Store

**Development Mode Issues**
```bash
# If developing locally
npm install
npm run dev

# Check for TypeScript errors
npm run build
```

**Command Registration**
Check `package.json` commands section:
```json
{
  "commands": [
    {
      "name": "enhance-prompt-general",
      "title": "Enhance Prompt (General)",
      "mode": "view"
    }
  ]
}
```

### 7. Error Messages

#### "Network Error"
```bash
# Check internet connection
ping google.com

# Test Ollama connectivity
curl http://localhost:11434/api/version

# Check firewall settings
```

#### "Model Not Found"
```bash
# List available models
ollama list

# Install missing model
ollama pull llama3.2:3b

# Update Promptify model setting
```

#### "Storage Error"
1. Restart Raycast
2. Clear extension data if needed
3. Check available disk space

#### "Validation Error" 
- Input too short (minimum 3 characters)
- Input too long (maximum 10,000 characters)
- Invalid characters in input

## 🔧 Diagnostic Tools

### System Information
```bash
# macOS version
sw_vers

# Hardware info
system_profiler SPHardwareDataType

# Available memory
vm_stat | grep "Pages free"

# Disk space
df -h /
```

### Ollama Diagnostics
```bash
# Ollama version
ollama --version

# List models
ollama list

# Test model
ollama run llama3.2:3b "Hello, test message"

# Check logs (if available)
tail -f ~/.ollama/logs/server.log
```

### Raycast Diagnostics
```bash
# Raycast version
# Check in Raycast → Settings → About

# Extension logs
# Check Console.app for Raycast logs
```

## 🆘 Getting Help

### Before Asking for Help

1. **Check this guide** for your specific issue
2. **Try the quick fixes** listed above
3. **Gather diagnostic information**:
   - macOS version
   - Raycast version
   - Ollama version and models
   - Exact error message
   - Steps to reproduce

### Support Channels

#### GitHub Issues
- **Bug Reports**: [Create an issue](https://github.com/Thomas-Basadonne/promptify-raycast/issues)
- **Feature Requests**: Use the feature request template
- **Questions**: Check existing issues first

#### Community Support
- **Raycast Discord**: Join the #extensions channel
- **GitHub Discussions**: For general questions and tips

### Issue Template
```markdown
## Problem Description
[Describe what's happening]

## Expected Behavior
[What should happen instead]

## System Information
- macOS: [version]
- Raycast: [version]
- Ollama: [version and models]
- Promptify: [version]

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [etc.]

## Error Messages
[Copy exact error text]

## Additional Context
[Screenshots, logs, etc.]
```

## 🔄 Maintenance

### Regular Maintenance

**Weekly**
```bash
# Update Ollama
brew update && brew upgrade ollama

# Update models
ollama pull llama3.2:3b
```

**Monthly**
```bash
# Clean up old models
ollama list
ollama rm old-model-name

# Clear history if needed
# Use Promptify History → Clear All
```

### Performance Monitoring

**Check Resource Usage**
```bash
# Monitor during enhancement
top -pid $(pgrep ollama)

# Check memory usage
ps aux | grep ollama
```

**Optimize Storage**
```bash
# Check Ollama storage
du -sh ~/.ollama/

# Remove unused models
ollama list
ollama rm unused-model
```

---

**Still having issues?** Open a [GitHub issue](https://github.com/Thomas-Basadonne/promptify-raycast/issues) with detailed information about your problem.
