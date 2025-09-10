# Boplink Extension - Product Specification Document

## Executive Summary

Boplink is a Raycast extension that enables seamless music and podcast sharing by converting streaming service URLs between different platforms. It solves the fundamental problem of content fragmentation across streaming services, allowing users to share music and podcasts with anyone regardless of their preferred platform.

## Table of Contents

1. [Business Context](#business-context)
2. [Product Overview](#product-overview)
3. [Technical Architecture](#technical-architecture)
4. [Data Flow](#data-flow)
5. [Platform Support Strategy](#platform-support-strategy)
6. [User Experience Flow](#user-experience-flow)
7. [Error Handling Specifications](#error-handling-specifications)
8. [Memory Optimization Techniques](#memory-optimization-techniques)
9. [Known Limitations](#known-limitations)
10. [Future Enhancement Ideas](#future-enhancement-ideas)

## Business Context

### Problem Statement

In today's fragmented streaming ecosystem, sharing music and podcasts has become increasingly complex. When a Spotify user shares a track with an Apple Music subscriber, the recipient cannot directly open the content in their preferred service. This creates friction in social music sharing, reduces engagement with shared content, and diminishes the overall user experience across platforms.

### Market Need

- **User Pain Point**: Users receive streaming links they cannot open in their subscribed services, leading to abandoned listening sessions
- **Social Friction**: Music and podcast recommendations between friends often go unheard due to platform incompatibility
- **Content Creator Impact**: Artists and podcasters lose potential audience reach due to platform lock-in

### Solution Value Proposition

Boplink eliminates platform barriers by providing instant, one-click conversion of streaming URLs across all major platforms, ensuring that shared content reaches its intended audience regardless of their service preference.

## Product Overview

### Core Functionality

Boplink operates as a lightweight Raycast extension that intercepts streaming platform URLs and converts them to equivalent links on all available platforms where the content exists.

### Key Features

1. **Universal Platform Support**: Converts between 15 music platforms and 5 podcast platforms
2. **Instant Conversion**: Sub-5 second conversion time for most content
3. **Rich Metadata Display**: Shows track/podcast title and artist
4. **Batch Operations**: Copy individual or all converted links simultaneously
5. **Smart Source Filtering**: Automatically excludes the source platform from results

### User Benefits

- **Zero Friction Sharing**: Share content with anyone, regardless of their platform
- **Time Savings**: No manual searching across multiple platforms
- **Discovery Enhancement**: Easily explore which platforms carry specific content
- **Workflow Integration**: Seamlessly integrated into Raycast for power users

## Technical Architecture

### System Components

#### 1. Frontend Layer (Raycast UI)
- **Technology**: React with TypeScript
- **Components**:
  - Form component for URL input
  - List component for displaying results
  - Action panels for user interactions
  - Toast notifications for system feedback

#### 2. Validation Layer
- **URL Validator**: Pattern matching engine using RegEx for platform identification
- **Platform Detector**: Determines content type (music vs. podcast) and source platform
- **Input Sanitization**: Normalizes URLs and validates format integrity

#### 3. Web Scraping Engine
- **Technology**: Puppeteer-core with system Chrome
- **Purpose**: Extracts platform links from song.link aggregator service
- **Optimization**: Headless browser with aggressive memory management

#### 4. Data Processing Layer
- **Link Extraction**: Parses DOM for platform-specific URLs
- **Metadata Extraction**: Captures title, artist, artwork, and content type
- **Platform Mapping**: Converts scraped data to structured platform objects

### Technology Stack

- **Runtime**: Node.js environment within Raycast
- **Language**: TypeScript for type safety
- **UI Framework**: Raycast's React-based component library
- **Web Automation**: Puppeteer-core for browser automation
- **Browser Engine**: System-installed Chrome/Chromium variants

### Why Puppeteer Was Chosen

#### Requirements Analysis
The extension needed to interact with song.link, a JavaScript-heavy single-page application that dynamically loads content. Static HTTP requests would not suffice as the platform links are rendered client-side after complex API calls and JavaScript execution.

#### Alternative Approaches Considered
1. **Direct API Access**: Song.link/Odesli does not provide public API access that is scalable (i.e.: the rate is 10 calls per minute)
2. **Static HTML Parsing**: Content is dynamically rendered, not available in initial HTML
3. **Playwright**: Heavier dependency with similar functionality
4. **Native HTTP Requests**: Cannot execute JavaScript or handle dynamic content

#### Puppeteer Advantages
- **JavaScript Execution**: Full browser engine for dynamic content rendering
- **Lightweight Integration**: Uses puppeteer-core with system Chrome to minimize bundle size
- **Resource Control**: Fine-grained control over browser resource usage
- **Reliability**: Mature ecosystem with predictable behavior

## Data Flow

### Conversion Flow Diagram

```
User Input → URL Validation → Platform Detection → Song.link Navigation
                                                           ↓
Results Display ← Platform Mapping ← Data Extraction ← Page Rendering
     ↓
User Actions (Copy/Open/Convert Another)
```

### Detailed Flow Stages

#### Stage 1: Input Processing
1. User provides streaming URL (via argument or form)
2. System validates URL format and structure
3. Platform detector identifies source service and content type
4. Validation confirms URL is from supported platform

#### Stage 2: Web Scraping
1. Puppeteer launches optimized headless browser instance
2. Browser navigates to song.link with encoded URL
3. Page waits for dynamic content to render
4. DOM is analyzed for platform links and metadata

#### Stage 3: Data Extraction
1. Scraper identifies all available platform links
2. Metadata extraction captures title, artist, and artwork
3. Links are validated against known platform patterns
4. Source platform is filtered from results

#### Stage 4: Result Presentation
1. Converted links are sorted alphabetically
2. Platform icons are matched and displayed
3. Metadata is shown in section headers
4. Quick actions are enabled for each result

### State Management Flow

```
Initial State → Loading State → Success State → Action State
      ↓              ↓              ↓              ↓
   Form View    Progress View   Results View   Updated View
      ↓              ↓              ↓              ↓
   [Input]      [Spinner]      [Link List]    [New State]
```

## Platform Support Strategy

### Current Platform Coverage

#### Music Platforms (16)
- **Tier 1 (Highest Priority)**: Spotify, Apple Music, YouTube Music
- **Tier 2 (Major Platforms)**: SoundCloud, Deezer, TIDAL, Amazon Music
- **Tier 3 (Regional/Niche)**: Pandora, Napster, Yandex Music, Audiomack, Audius

#### Podcast Platforms (5)
- **Primary Input**: Apple Podcasts (only platform accepting input URLs)
- **Output Platforms**: Google Podcasts, Overcast, Castbox, Pocket Casts

### Platform Addition Criteria

New platforms are evaluated based on:
1. **API/URL Structure**: Consistent, parseable URL patterns
2. **Song.link Support**: Platform must be indexed by song.link
3. **User Demand**: Requested by 10+ users or strategic importance

### Platform Maintenance Strategy

- **Quarterly Reviews**: URL pattern validation and updates
- **Automated Testing**: Regular verification of platform availability

## User Experience Flow

### Primary User Journey

#### Scenario 1: Direct URL Conversion
1. User copies streaming URL to clipboard
2. Triggers Boplink with keyboard shortcut
3. URL auto-populates if in clipboard
4. User presses Enter to convert
5. Results appear within 3-5 seconds
6. User copies desired platform link
7. Success notification confirms action

#### Scenario 2: Manual URL Entry
1. User opens Boplink without URL
2. Form interface appears
3. User pastes or types streaming URL
4. Real-time validation provides feedback
5. Conversion proceeds on submission
6. Results display with platform options

### UI/UX Design Principles

#### Efficiency First
- Minimal clicks to complete action
- Keyboard shortcuts for power users
- Auto-detection of clipboard content

#### Clear Visual Hierarchy
- Platform icons for quick recognition
- Metadata prominently displayed
- Source platform automatically filtered

#### Immediate Feedback
- Loading states during processing
- Success/error toast notifications
- Progress indicators for long operations

### Interaction Patterns

#### Quick Actions
- **Enter**: Primary action (copy link)
- **⌘1-9**: Copy links by position
- **⌘N**: Convert another URL
- **⌘⇧C**: Copy all links at once

#### Visual Feedback
- Loading spinner during conversion
- Platform icons for recognition
- Formatted metadata display
- Error states with clear messaging

## Error Handling Specifications

### Error Categories

#### Category 1: Input Validation Errors
- **Invalid URL Format**: Clear message indicating URL structure issue
- **Unsupported Platform**: List of supported platforms provided
- **Already Converted URL**: Detection of song.link URLs with appropriate messaging

#### Category 2: Network Errors
- **Connection Timeout**: 20-second timeout with retry suggestion
- **Service Unavailable**: Graceful degradation with user guidance
- **Rate Limiting**: Exponential backoff with user notification

#### Category 3: Browser Errors
- **Chrome Not Found**: Detailed installation instructions for compatible browsers
- **Launch Failure**: System resource check and recommendations
- **Memory Exhaustion**: Automatic recovery with reduced resource mode

#### Category 4: Content Errors
- **Content Not Found**: Platform-specific availability messaging
- **Region Restrictions**: Geographic limitation notifications
- **No Alternative Platforms**: Clear explanation with suggestions

### Error Recovery Strategies

#### Automatic Recovery
1. **Retry Logic**: 3 attempts with exponential backoff
2. **Fallback Modes**: Reduced feature set if primary method fails
3. **Resource Cleanup**: Automatic browser closure on errors
4. **State Reset**: Clean slate for subsequent attempts

#### User-Guided Recovery
1. **Clear Instructions**: Step-by-step resolution guides
2. **Alternative Actions**: Suggest manual search when automation fails
3. **Support Resources**: Links to documentation and help
4. **Feedback Mechanism**: Error reporting to improve system

### Error Message Philosophy

- **Human-Readable**: Technical jargon avoided
- **Actionable**: Clear next steps provided
- **Contextual**: Relevant to user's current task
- **Non-Alarming**: Calm, helpful tone maintained

## Memory Optimization Techniques

### Browser Resource Management

#### Aggressive Memory Controls
- **Single Process Mode**: Forces Chrome to run in single-process mode
- **JavaScript Heap Limits**: Restricts V8 heap to 256MB maximum
- **GPU Acceleration Disabled**: Prevents unnecessary graphics memory usage
- **Extension Blocking**: Disables all browser extensions

#### Request Interception Strategy
- **Resource Filtering**: Blocks images, fonts, stylesheets, media
- **Analytics Blocking**: Prevents tracking scripts from loading
- **Selective Loading**: Only allows document, script, and XHR requests
- **Domain Blacklisting**: Blocks known tracking and advertising domains

### Lifecycle Management

#### Page Lifecycle
1. **On-Demand Creation**: Pages created only when needed
2. **Immediate Cleanup**: Pages closed after each operation
3. **No Persistence**: No caching between conversions
4. **Resource Monitoring**: Active memory usage tracking

#### Browser Lifecycle
1. **Lazy Initialization**: Browser launched on first use
2. **Reuse Strategy**: Single browser instance for session
3. **Timeout Management**: Automatic closure after inactivity
4. **Crash Recovery**: Automatic restart on browser failure

### Performance Metrics

- **Target Memory Usage**: Under 150MB total
- **Conversion Time**: 3-5 seconds average
- **Browser Launch**: 2-3 seconds initial
- **Page Load**: 2-4 seconds per conversion

## Known Limitations

### Technical Limitations

#### Browser Dependencies
- **Requirement**: System must have Chrome-based browser installed
- **Impact**: Cannot function without Chrome, Chromium, Brave, Edge, or Arc
- **Workaround**: Installation instructions provided in error messages

#### Platform Coverage
- **Song.link Dependency**: Only platforms indexed by song.link are supported
- **Regional Restrictions**: Some platforms unavailable in certain regions
- **Content Gaps**: Not all content exists on all platforms

#### Performance Constraints
- **Memory Usage**: Puppeteer requires significant memory overhead
- **Processing Time**: 3-5 second minimum due to web scraping
- **Concurrent Limits**: Single conversion at a time

### Functional Limitations

#### Content Types
- **Podcast Limitations**: Only Apple Podcasts accepted as input
- **Video Content**: YouTube Music videos may not map to audio tracks
- **Live Content**: Streaming radio and live content not supported
- **User Playlists**: Private playlists cannot be converted

#### Metadata Accuracy
- **Extraction Reliability**: Dependent on song.link's page structure
- **Missing Information**: Some platforms may lack complete metadata
- **Language Support**: Best results with English-language content

### User Experience Limitations

#### Workflow Constraints
- **Single URL**: One URL at a time, no batch input
- **Manual Process**: Requires user initiation for each conversion
- **No History**: Previous conversions not saved
- **Platform Authentication**: Cannot access user-specific content

## Future Enhancement Ideas

### Enhancements

#### Performance Improvements
- **Caching Layer**: Store recent conversions for instant recall
- **Native API Integration**: Direct platform APIs where available

#### Feature Additions
- **Batch URL Processing**: Convert multiple URLs in one operation
- **Conversion History**: Track and recall previous conversions
- **Playlist Conversion**: Support for full playlist migration
- **Quick Share**: Direct sharing to messaging apps
- **Content Fingerprinting**: Match content without URLs
- **Cross-Media Matching**: Find podcast episodes from video content

### Innovation Opportunities

#### AI Integration
- **Natural Language Input**: "Find that song from Spotify on Apple Music"
- **Content Recognition**: Audio fingerprinting for unknown sources
- **Personalized Suggestions**: ML-based platform recommendations
- **Automated Playlist Curation**: Cross-platform playlist optimization

## Success Metrics

### User Engagement
- **Active Users**: Target 10 DAU within first year

### Technical Performance
- **Uptime**: 99.9% availability
- **Error Rate**: <1% conversion failures
- **Memory Efficiency**: <150MB average usage
- **Response Time**: <3 second P50 latency

### Business Impact
- **Platform Coverage**: 95% of global streaming market
- **User Satisfaction**: >4.5 star average rating
- **Growth Rate**: 20% month-over-month user growth

## Conclusion

Boplink represents a critical utility in the modern streaming ecosystem, bridging the gap between platform silos and enabling frictionless content sharing. Through careful technical optimization and user-centered design, it delivers a simple yet powerful solution to a universal problem faced by millions of streaming service users worldwide.
