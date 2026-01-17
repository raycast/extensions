#!/usr/bin/env npx tsx

/**
 * Linear API Integration Test
 * Tests the Linear service structure and API integration
 */

import { LinearService } from './src/services/linear.service.js';

async function testLinearIntegration() {
  console.log('🔍 Testing Linear API Integration...');

  const token = process.env.LINEAR_TOKEN;
  if (!token) {
    console.error('❌ LINEAR_TOKEN environment variable not set');
    console.log('To test Linear integration:');
    console.log('1. Get your Linear API key from https://linear.app/settings/api');
    console.log('2. Set LINEAR_TOKEN=your_api_key');
    console.log('3. Run: npm run test:linear');
    process.exit(1);
  }

  try {
    const linearService = new LinearService(token);
    console.log('✅ LinearService instantiated successfully');

    console.log('\n📋 Fetching assigned issues...');
    const issues = await linearService.getAssignedIssues();
    console.log(`✅ Found ${issues.length} assigned issues`);

    if (issues.length > 0) {
      console.log(`   📝 Sample issue: "${issues[0].title}"`);
      console.log(`   🔗 URL: ${issues[0].url}`);
      console.log(`   📊 Priority: ${issues[0].priority}`);
    }

    console.log('\n🎯 Linear integration test completed successfully!');
    console.log(`📊 Total Linear tasks: ${issues.length}`);

  } catch (error: any) {
    console.error('❌ Linear integration test failed:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    process.exit(1);
  }
}

testLinearIntegration().catch((error) => {
  console.error('💥 Test failed with error:', error);
  process.exit(1);
});