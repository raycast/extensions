#!/usr/bin/env npx tsx

/**
 * Mock GitHub API Integration Test
 * Tests the GitHub service structure without real API calls
 */

import axios from 'axios';
import { GitHubService } from './src/services/github.service.js';

// Mock data
const mockIssuesResponse = {
  data: [
    {
      id: 12345,
      title: 'Test Issue',
      body: 'This is a test issue body',
      html_url: 'https://github.com/owner/repo/issues/12345',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-02T10:00:00Z',
      labels: [{ name: 'bug' }, { name: 'urgent' }],
      assignees: [{ login: 'testuser' }],
      repository: { full_name: 'owner/repo' }
    },
    {
      id: 67890,
      title: 'Test Assigned Pull Request',
      body: 'This is a test assigned PR body',
      html_url: 'https://github.com/owner/repo/pull/67890',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-02T10:00:00Z',
      labels: [{ name: 'enhancement' }],
      assignees: [{ login: 'testuser' }],
      repository: { full_name: 'owner/repo' },
      pull_request: { url: 'https://api.github.com/repos/owner/repo/pulls/67890' } // This marks it as a PR
    }
  ]
};

const mockPRsResponse = {
  data: [
    {
      id: 67890,
      title: 'Test Pull Request',
      body: 'This is a test PR body',
      html_url: 'https://github.com/owner/repo/pull/67890',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-02T10:00:00Z',
      labels: [{ name: 'enhancement' }],
      assignees: [{ login: 'testuser' }],
      repository: { full_name: 'owner/repo' },
      draft: false
    }
  ]
};

// Mock axios instance
const mockAxiosInstance = {
  get: (url: string) => {
    if (url.includes('/issues')) {
      return Promise.resolve(mockIssuesResponse);
    } else if (url.includes('/pulls')) {
      return Promise.resolve(mockPRsResponse);
    }
    return Promise.reject(new Error(`Unknown endpoint: ${url}`));
  }
};

// Mock axios.create
const originalCreate = axios.create;
axios.create = () => mockAxiosInstance as any;

async function testGitHubServiceStructure() {
  console.log('🔍 Testing GitHub Service Structure...');

  try {
    // Test service instantiation
    const githubService = new GitHubService('mock-token');
    console.log('✅ GitHubService instantiated successfully');

    // Test method calls (will use mock data)
    console.log('\n📋 Testing getAssignedIssues()...');
    const issues = await githubService.getAssignedIssues();
    console.log(`✅ getAssignedIssues() returned ${issues.length} items`);

    if (issues.length > 0) {
      console.log(`   📝 Sample issue: "${issues[0].title}"`);
      console.log(`   🔗 URL: ${issues[0].url}`);
      console.log(`   📊 Priority: ${issues[0].priority}`);
    }

    console.log('\n🔄 Testing getPullRequests()...');
    const prs = await githubService.getPullRequests();
    console.log(`✅ getPullRequests() returned ${prs.length} items`);

    if (prs.length > 0) {
      console.log(`   📝 Sample PR: "${prs[0].title}"`);
      console.log(`   🔗 URL: ${prs[0].url}`);
      console.log(`   📊 Priority: ${prs[0].priority}`);
    }

    console.log('\n✅ GitHub Service structure test passed!');
    console.log('🎯 Service is ready for real API integration testing');

  } finally {
    // Clean up axios.create mock
    axios.create = originalCreate;
  }
}

// Run the test
testGitHubServiceStructure().catch((error) => {
  console.error('💥 Test failed with error:', error);
  process.exit(1);
});