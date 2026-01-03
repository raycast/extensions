# API Integration Guide

This document outlines the API integrations required for the Developer Decision Navigator extension.

## Overview

The extension integrates with three main APIs:
- GitHub REST API (v3)
- Linear GraphQL API
- Slack Web API

## Authentication

### GitHub
- **Type**: Personal Access Token (PAT)
- **Scopes Required**: `repo`, `read:org`, `read:user`
- **Storage**: Raycast preferences
- **Rate Limit**: 5,000 requests/hour

### Linear
- **Type**: API Key
- **Scopes Required**: `read`
- **Storage**: Raycast preferences
- **Rate Limit**: 1,000 requests/hour

### Slack
- **Type**: Bot Token or User Token
- **Scopes Required**: `channels:read`, `groups:read`, `mpim:read`, `im:read`, `channels:history`, `groups:history`, `mpim:history`, `im:history`
- **Storage**: Raycast preferences
- **Rate Limit**: 1,000 requests/minute (Tier 1)

## Data Collection

### GitHub Tasks
- **Issues**: Assigned to user, open status
- **Pull Requests**: Created by user, open status, assigned to user
- **Reviews**: Pending reviews on PRs

### Linear Tasks
- **Issues**: Assigned to user, active states
- **Projects**: Issues in active projects

### Slack Tasks
- **Messages**: Mentions (@user), direct messages
- **Channels**: Configured channels for task extraction

## Priority Scoring

Tasks are scored based on:
- **Urgency**: Due dates, SLA requirements
- **Importance**: Business impact, stakeholder priority
- **Effort**: Estimated time, complexity
- **Dependencies**: Blocking other work
- **Context**: Current focus areas

## Error Handling

- **Network Failures**: Retry with exponential backoff
- **Rate Limits**: Respect API limits, cache results
- **Authentication Errors**: Prompt user to refresh tokens
- **Partial Failures**: Continue with available data

## Caching Strategy

- **Cache Duration**: 5 minutes for task data
- **Storage**: Raycast's built-in storage API
- **Invalidation**: Manual refresh, time-based expiry

## Testing

- **Mock Data**: Use for development and testing
- **API Limits**: Respect rate limits in production
- **Error Scenarios**: Test offline, expired tokens, API changes