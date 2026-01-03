#!/usr/bin/env npx tsx

/**
 * Slack API Integration Test
 * Tests the Slack service structure and API integration
 */

import { SlackService } from './src/services/slack.service.js';

async function testSlackIntegration() {
  console.log('🔍 Testing Slack API Integration...');

  const token = process.env.SLACK_TOKEN;
  if (!token) {
    console.error('❌ SLACK_TOKEN environment variable not set');
    console.log('To test Slack integration:');
    console.log('1. Create a Slack app at https://api.slack.com/apps');
    console.log('2. Add bot token scopes: channels:history, groups:history, im:history, mpim:history');
    console.log('3. Install the app to your workspace');
    console.log('4. Set SLACK_TOKEN=xoxb-your-bot-token');
    console.log('5. Run: npm run test:slack');
    process.exit(1);
  }

  try {
    const slackService = new SlackService(token);
    console.log('✅ SlackService instantiated successfully');

    console.log('\n💬 Fetching mentions and DMs...');
    const tasks = await slackService.getMentionsAndDMs();
    console.log(`✅ Found ${tasks.length} Slack tasks`);

    if (tasks.length > 0) {
      console.log(`   📝 Sample task: "${tasks[0].title}"`);
      console.log(`   🔗 URL: ${tasks[0].url}`);
      console.log(`   📊 Priority: ${tasks[0].priority}`);
    }

    console.log('\n🎯 Slack integration test completed successfully!');
    console.log(`📊 Total Slack tasks: ${tasks.length}`);

  } catch (error: any) {
    console.error('❌ Slack integration test failed:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    process.exit(1);
  }
}

testSlackIntegration().catch((error) => {
  console.error('💥 Test failed with error:', error);
  process.exit(1);
});