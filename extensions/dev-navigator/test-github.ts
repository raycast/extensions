#!/usr/bin/env npx tsx

/**
 * GitHub API Integration Test
 * Tests the GitHub service with real API calls
 */

import { GitHubService } from './src/services/github.service.js';

async function testGitHubIntegration() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.error('❌ GITHUB_TOKEN environment variable not set');
    console.log('Please set your GitHub token:');
    console.log('export GITHUB_TOKEN=your_github_token_here');
    console.log('\nTo get a GitHub token:');
    console.log('1. Go to https://github.com/settings/tokens');
    console.log('2. Generate a new token with "repo" scope');
    console.log('3. Copy the token and set it as GITHUB_TOKEN');
    process.exit(1);
  }

  console.log('🔍 Testing GitHub API Integration...');
  console.log('Token:', token.substring(0, 8) + '...');

  const githubService = new GitHubService(token);

  try {
    console.log('\n📋 Fetching assigned issues...');
    const issues = await githubService.getAssignedIssues();
    console.log(`✅ Found ${issues.length} assigned issues`);

    if (issues.length > 0) {
      console.log('Sample issue:', {
        id: issues[0].id,
        title: issues[0].title.substring(0, 50) + (issues[0].title.length > 50 ? '...' : ''),
        source: issues[0].source,
        type: issues[0].type,
        priority: issues[0].priority,
      });
    }

    console.log('\n🔄 Fetching pull requests...');
    const prs = await githubService.getPullRequests();
    console.log(`✅ Found ${prs.length} pull requests`);

    if (prs.length > 0) {
      console.log('Sample PR:', {
        id: prs[0].id,
        title: prs[0].title.substring(0, 50) + (prs[0].title.length > 50 ? '...' : ''),
        source: prs[0].source,
        type: prs[0].type,
        priority: prs[0].priority,
      });
    }

    const totalTasks = issues.length + prs.length;
    console.log(`\n🎯 Total GitHub tasks: ${totalTasks}`);

    if (totalTasks > 0) {
      console.log('✅ GitHub API integration successful!');
      console.log('\n📊 Task breakdown:');
      issues.forEach((issue, i) => {
        if (i < 3) { // Show first 3 issues
          console.log(`  • Issue: ${issue.title.substring(0, 60)}${issue.title.length > 60 ? '...' : ''}`);
        }
      });
      prs.forEach((pr, i) => {
        if (i < 3) { // Show first 3 PRs
          console.log(`  • PR: ${pr.title.substring(0, 60)}${pr.title.length > 60 ? '...' : ''}`);
        }
      });
    } else {
      console.log('⚠️ No tasks found - this might be normal if you have no assigned issues/PRs');
      console.log('Try creating a test issue or PR to verify the integration works.');
    }

  } catch (error: any) {
    console.error('❌ GitHub API integration failed:', error.message);

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);

      if (error.response.status === 401) {
        console.log('\n🔐 Authentication failed. Check your token:');
        console.log('1. Verify the token is correct');
        console.log('2. Ensure it has "repo" scope');
        console.log('3. Make sure it hasn\'t expired');
      } else if (error.response.status === 403) {
        console.log('\n🚫 Forbidden. Check your token permissions:');
        console.log('Your token needs "repo" scope for private repositories');
      } else if (error.response.status === 404) {
        console.log('\n🔍 Not found. Check your token and repository access');
      }
    }

    process.exit(1);
  }
}

// Run the test
testGitHubIntegration().catch((error) => {
  console.error('💥 Test failed with error:', error);
  process.exit(1);
});