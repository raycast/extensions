# Canvas LMS Raycast Extension

A comprehensive Raycast extension that provides seamless integration with Canvas Learning Management System. Manage your courses, check grades, track assignments, and navigate Canvas efficiently - all from your desktop.

## ✨ Features

### 🎓 **Canvas Courses Command**
- **Course Overview**: View all active courses with enrollment details
- **Quick Navigation**: Direct access to course home, modules, assignments, grades, and files
- **Course Management**: Set custom course nicknames for better organization
- **Smart Caching**: 15-minute cache for fast loading and reduced API calls
- **Keyboard Shortcuts**: Efficient navigation with custom shortcuts for all actions

### 📊 **Canvas Grades Command** 
- **Real-time Grades**: Check current course grades with live Canvas data
- **Grade Display**: View numerical scores and letter grades as provided by Canvas
- **Course Context**: See grades in context of course names and codes
- **Smart Caching**: 5-minute cache for up-to-date grade information
- **Quick Access**: Navigate directly to course grade pages

### 📝 **Canvas Assignments Command**
- **Next Due Assignments**: See upcoming work across all courses
- **Recently Completed**: Track your latest submissions and progress
- **Assignment Statistics**: Course-by-course workload overview with status indicators
- **Smart Navigation**: Click course titles to view detailed assignments
- **Efficient Caching**: 10-minute cache for optimal performance

### 🔧 **Technical Features**
- **Smart Caching**: Intelligent caching system reduces API calls and improves performance
- **Error Handling**: Graceful fallbacks and user-friendly error messages
- **Type Safety**: Full TypeScript implementation for reliability
- **API Efficiency**: Optimized Canvas API usage with proper rate limiting

## 🚀 Setup

### 1. Get Your Canvas API Token

1. Log into your Canvas instance
2. Go to **Account** → **Settings** → **API Keys**
3. Click **Generate API Key**
4. Give it a name (e.g., "Raycast Extension")
5. Copy the generated token (you won't be able to see it again)

### 2. Configure the Extension

1. Open Raycast and go to **Extensions**
2. Find "Canvas LMS" and click the gear icon to open preferences
3. Enter your Canvas instance URL (e.g., `https://canvas.instructure.com`)
4. Enter your API token
5. Save the preferences

## 📱 Usage

### **Canvas Courses** (`Canvas Courses`)
- View all your active courses with enrollment information
- Set custom nicknames for courses using the "Set Nickname" action
- Navigate to course sections (Home, Modules, Assignments, Grades, Files)
- Use keyboard shortcuts for quick actions
- Refresh data or clear cache as needed

### **Canvas Grades** (`Canvas Grades`)
- Check current course grades across all your classes
- See both numerical scores and letter grades
- Navigate directly to course grade pages
- Refresh grades or clear cache for updated information

### **Canvas Assignments** (`Canvas Assignments`)
- **Next Due Section**: See assignments due soon across all courses
- **Recently Completed**: View your latest submissions
- **Assignment Statistics**: Click course titles to see detailed assignment pages
- Get workload overview with visual status indicators

## 🔗 Canvas Instance URLs

Common Canvas instance URLs:
- **Canvas Cloud**: `https://canvas.instructure.com`
- **Custom Instances**: Your institution's Canvas URL (e.g., `https://canvas.youruniversity.edu`)

## 🔐 API Permissions

The extension requires the following Canvas API permissions:
- Read access to courses and enrollments
- Read access to assignments and submissions
- Read access to user profiles and course nicknames
- Read access to upcoming events and analytics

## 🛠️ Development

### Prerequisites

- Node.js 18+
- Raycast extension development environment

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## 🔧 Troubleshooting

### Common Issues

1. **"Configuration Error"**: Ensure both Canvas URL and API token are set in preferences
2. **"Failed to load Canvas data"**: Verify your API token and Canvas URL are correct
3. **No courses showing**: Check that your API token has the necessary permissions
4. **Grades not updating**: Try refreshing the data or clearing the cache

### Cache Management

- **Courses**: 15-minute cache (refresh manually or clear cache)
- **Grades**: 5-minute cache (refresh manually or clear cache)  
- **Assignments**: 10-minute cache (refresh manually or clear cache)
- Use "Clear Cache" action to force fresh data

### API Token Security

- Never share your API token
- The token is stored securely in Raycast preferences
- You can revoke the token from Canvas Settings if needed

## 🎯 Keyboard Shortcuts

### **Courses Command**
- `⌘ + Enter`: Open course home
- `⌘ + M`: Open course modules
- `⌘ + A`: Open course assignments
- `⌘ + G`: Open course grades
- `⌘ + F`: Open course files

### **General Actions**
- `⌘ + R`: Refresh data
- `⌘ + C`: Copy to clipboard
- `⌘ + Delete`: Clear cache

## 🚧 Future Features

Planned enhancements:
- Due date alerts and notifications
- Course calendar integration
- Assignment submission tracking
- Grade trend analysis
- Study time tracking

## 🤝 Contributing

Feel free to submit issues, feature requests, and pull requests!

## 📄 License

MIT License - see LICENSE file for details.