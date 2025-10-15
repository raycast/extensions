# Troubleshooting Guide

This guide helps you resolve common issues with the Noko Raycast extension.

## 🚨 Common Issues

### Extension Not Loading

#### Symptoms

- Extension doesn't appear in Raycast
- "Extension not found" error
- Blank screen when opening extension

#### Solutions

1. **Check Raycast Developer Mode**

   ```bash
   # Open Raycast Preferences
   Cmd + , → Advanced → Enable Developer Mode
   ```

2. **Reimport Extension**

   - In Raycast, type "Import Extension"
   - Select "Import from Folder"
   - Choose the extension folder

3. **Check Build Status**

   ```bash
   # Check for build errors
   npm run dev
   # Look for compilation errors in terminal
   ```

4. **Restart Raycast**
   - Quit Raycast completely
   - Restart the application
   - Try accessing the extension again

### API Authentication Issues

#### Symptoms

- "Unauthorized" errors
- "Invalid token" messages
- No data loading

#### Solutions

1. **Verify Personal Access Token**

   - Log in to [Noko](https://nokotime.com)
   - Go to Settings → Integration & Apps
   - Check if your token is still valid
   - Generate a new token if needed

2. **Check Token Permissions**

   - Ensure token has proper permissions
   - Verify token hasn't expired
   - Check if account is active

3. **Update Token in Raycast**

   - Open Raycast Preferences
   - Go to Extensions → Noko
   - Enter the correct Personal Access Token
   - Save preferences

4. **Test API Connection**
   ```bash
   # Test API connectivity
   curl -H "X-NokoToken: YOUR_TOKEN" \
        https://api.nokotime.com/v2/projects
   ```

### Timer Issues

#### Symptoms

- Timers not starting
- Elapsed time not updating
- Timer state not syncing

#### Solutions

1. **Check Timer State**

   - Verify no other timers are running
   - Check if project is enabled
   - Ensure user has project permissions

2. **Refresh Data**

   - Use Cmd + R to refresh Raycast
   - Or restart the extension

3. **Check Network Connection**

   - Ensure stable internet connection
   - Check if Noko API is accessible
   - Verify no firewall blocking requests

4. **Clear Cache**
   ```bash
   # Clear Raycast cache
   rm -rf ~/Library/Caches/com.raycast.macos
   ```

### Entry Creation Issues

#### Symptoms

- Entries not saving
- Form validation errors
- Time format issues

#### Solutions

1. **Check Time Format**

   - Use "h:mm" format (e.g., "1:30")
   - Or use minutes (e.g., "90")
   - Avoid invalid formats

2. **Verify Required Fields**

   - Ensure project is selected
   - Check if description is provided
   - Verify date is valid

3. **Check Project Permissions**

   - Ensure user can create entries for project
   - Verify project is enabled
   - Check billing increment settings

4. **Test Manual Entry**
   - Try creating entry through Noko web interface
   - Compare with extension behavior
   - Check for differences

### Performance Issues

#### Symptoms

- Slow loading times
- Laggy interface
- High memory usage

#### Solutions

1. **Check System Resources**

   - Monitor CPU and memory usage
   - Close unnecessary applications
   - Restart Raycast if needed

2. **Clear Extension Cache**

   ```bash
   # Clear extension-specific cache
   rm -rf ~/Library/Caches/com.raycast.macos/Extensions
   ```

3. **Reduce Data Load**

   - Limit number of projects
   - Reduce entry history range
   - Disable real-time updates if needed

4. **Update Dependencies**
   ```bash
   # Update to latest versions
   npm update
   npm run build
   ```

## 🔧 Debug Mode

### Enable Debug Logging

1. **Open Raycast Preferences**

   - Press `Cmd + ,`
   - Go to Advanced
   - Enable "Developer Console"

2. **Check Console Logs**

   - Open Developer Console
   - Look for error messages
   - Check network requests

3. **Add Debug Logging**
   ```typescript
   // Add to your code for debugging
   console.log("Debug info:", { data, error });
   ```

### Network Debugging

1. **Check API Requests**

   - Open browser dev tools
   - Go to Network tab
   - Monitor API calls

2. **Test API Endpoints**

   ```bash
   # Test specific endpoints
   curl -H "X-NokoToken: YOUR_TOKEN" \
        https://api.nokotime.com/v2/timers
   ```

3. **Check Response Format**
   - Verify JSON response structure
   - Check for error messages
   - Validate data types

## 🛠️ Advanced Troubleshooting

### Reset Extension

1. **Remove Extension**

   - Delete extension from Raycast
   - Clear all preferences

2. **Reinstall Extension**
   - Import extension again
   - Reconfigure settings
   - Test functionality

### System-Level Issues

1. **Check macOS Permissions**

   - System Preferences → Security & Privacy
   - Ensure Raycast has necessary permissions
   - Check network access

2. **Update System**

   - Update macOS to latest version
   - Update Raycast to latest version
   - Check for compatibility issues

3. **Check System Logs**
   ```bash
   # Check system logs for errors
   log show --predicate 'process == "Raycast"' --last 1h
   ```

### Development Issues

1. **Build Errors**

   ```bash
   # Check TypeScript errors
   npx tsc --noEmit

   # Check linting issues
   npm run lint

   # Format code
   npm run format
   ```

2. **Dependency Issues**

   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Environment Issues**
   - Check Node.js version
   - Verify npm version
   - Check environment variables

## 📞 Getting Help

### Before Asking for Help

1. **Check Documentation**

   - Read this troubleshooting guide
   - Check README and development docs
   - Search existing issues

2. **Gather Information**

   - Error messages
   - Steps to reproduce
   - System information
   - Extension version

3. **Try Basic Solutions**
   - Restart Raycast
   - Clear cache
   - Reinstall extension

### Where to Get Help

1. **GitHub Issues**

   - Create detailed bug report
   - Include system information
   - Provide error logs

2. **GitHub Discussions**

   - Ask questions
   - Share solutions
   - Discuss features

3. **Raycast Community**

   - Raycast Discord
   - Raycast Forum
   - Community support

4. **Noko Support**
   - For API-related issues
   - Account problems
   - Noko-specific questions

### Information to Include

When asking for help, include:

- **System Information**

  - macOS version
  - Raycast version
  - Extension version
  - Node.js version

- **Error Details**

  - Exact error messages
  - Steps to reproduce
  - Expected vs actual behavior

- **Debug Information**
  - Console logs
  - Network requests
  - System logs

## 🔍 Diagnostic Commands

### System Information

```bash
# Check system version
sw_vers

# Check Raycast version
raycast --version

# Check Node.js version
node --version

# Check npm version
npm --version
```

### Extension Information

```bash
# Check extension build
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Check linting
npm run lint
```

### Network Diagnostics

```bash
# Test Noko API connectivity
curl -I https://api.nokotime.com/v2/projects

# Check DNS resolution
nslookup api.nokotime.com

# Test with your token
curl -H "X-NokoToken: YOUR_TOKEN" \
     https://api.nokotime.com/v2/projects
```

## 📋 Checklist

Before reporting an issue, check:

- [ ] Raycast is up to date
- [ ] Extension is properly installed
- [ ] Personal Access Token is valid
- [ ] Internet connection is stable
- [ ] No firewall blocking requests
- [ ] System permissions are correct
- [ ] Cache has been cleared
- [ ] Extension has been restarted
- [ ] Error logs have been checked
- [ ] Documentation has been reviewed

## 🎯 Prevention

To avoid common issues:

1. **Keep Updated**

   - Update Raycast regularly
   - Update extension when available
   - Keep macOS updated

2. **Monitor Resources**

   - Check system performance
   - Monitor memory usage
   - Close unused applications

3. **Backup Settings**

   - Export extension preferences
   - Save Personal Access Token
   - Document custom configurations

4. **Test Regularly**
   - Test extension functionality
   - Verify API connectivity
   - Check for updates

Remember: Most issues can be resolved by restarting Raycast, clearing cache, or updating the extension. If problems persist, don't hesitate to ask for help! 🆘
