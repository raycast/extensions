# Development Setup Guide

## Quick Start

1. **Install dependencies**: `npm install`
2. **Start development mode**: `npm run dev`
3. **Build for production**: `npm run build`

## Testing the Extension

### 1. Development Mode
```bash
npm run dev
```
This will start the extension in development mode and automatically reload when you make changes.

### 2. Testing Preferences
- Open Raycast
- Go to Extensions
- Find "Canvas LMS" and click the gear icon
- Configure your Canvas URL and API token
- Test the extension

### 3. Canvas API Testing
You can test the Canvas API endpoints directly:

```bash
# Test courses endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "https://YOUR_CANVAS_URL/api/v1/courses?enrollment_state=active"

# Test upcoming events
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "https://YOUR_CANVAS_URL/api/v1/users/self/upcoming_events"
```

## Common Development Tasks

### Adding New Commands
1. Update `package.json` commands array
2. Create new command file in `src/`
3. Implement the command logic
4. Test with `npm run dev`

### Adding New API Endpoints
1. Add method to `src/canvas-api.ts`
2. Update interfaces if needed
3. Use in your command component
4. Test the API call

### Error Handling
- Always wrap API calls in try-catch
- Show user-friendly error messages
- Log detailed errors for debugging
- Handle network timeouts gracefully

## Debugging Tips

1. **Check Raycast Console**: View logs in Raycast preferences
2. **API Response**: Log API responses to see data structure
3. **Preferences**: Verify preferences are loaded correctly
4. **Network**: Check if Canvas API is accessible

## Canvas API Reference

- **Courses**: `/api/v1/courses`
- **Assignments**: `/api/v1/courses/{id}/assignments`
- **Events**: `/api/v1/users/self/upcoming_events`
- **Profile**: `/api/v1/users/self/profile`

## Security Notes

- Never log API tokens
- Store sensitive data in Raycast preferences only
- Validate all user inputs
- Handle API errors gracefully
