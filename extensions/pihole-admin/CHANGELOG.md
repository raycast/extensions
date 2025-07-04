# Changelog

All notable changes to this extension will be documented in this file.

## [1.0.0] - {PR_MERGE_DATE}

### Added
- ✨ **Complete Pi-hole v6 Support**: Integration with the new REST API
- 📊 **Status Dashboard**: Complete visualization of Pi-hole statistics
- ⚡ **Blocking Control**: Enable/disable with duration options (5min, 30min, 1h, 2h, permanent)
- 📝 **Query Log**: Filterable DNS query log with search capabilities
- 📈 **Top Domains**: Statistics of most queried and blocked domains
- 👥 **Top Clients**: View of clients with the most DNS queries
- ➕ **Add Domains**: Form to add domains to allowlist/blocklist
- 🗑️ **Flush Logs**: Command to clear all logs with confirmation
- 🔒 **Secure Authentication**: Pi-hole v6 session-based authentication system (SID)
- 🌓 **SSL Support**: Option to verify/ignore SSL certificates
- ⌨️ **Keyboard Shortcuts**: Shortcuts for common actions (Cmd+R to refresh, etc.)
- 🔍 **Advanced Search**: Filters by status, domain, client in logs
- 📱 **Optimized UX**: Interfaces designed specifically for Raycast

### Technical Features
- 🔄 **Session Management**: Automatic renewal of expired sessions
- 🚀 **Smart Caching**: Use of `useCachedPromise` for better performance
- 🛡️ **Data Validation**: Validation of domain and URL formats
- 📦 **TypeScript**: Fully typed code for greater robustness
- 🧪 **Error Handling**: Comprehensive error handling with informative messages

### Migration Notes
- This extension requires **Pi-hole v6.0 or higher**
- Pi-hole v5 users must upgrade before using this extension
- The original "pie-for-pihole" extension is not compatible with Pi-hole v6

---

**Note**: This is a complete rewrite of the original extension for Pi-hole v6. It does not maintain compatibility with previous Pi-hole versions due to fundamental API changes. 