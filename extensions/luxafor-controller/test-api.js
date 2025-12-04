const axios = require('axios');

// Test configuration - replace with your actual User ID
const USER_ID = 'YOUR_USER_ID_HERE'; // Replace this
const API_ENDPOINT = 'com'; // or 'co.uk'

const baseUrl = `https://api.luxafor.${API_ENDPOINT}/webhook/v1/actions`;

async function testLuxaforAPI() {
  console.log('🧪 Testing Luxafor API...');
  console.log(`📍 Endpoint: ${baseUrl}`);
  console.log(`👤 User ID: ${USER_ID}`);
  console.log('');

  if (USER_ID === 'YOUR_USER_ID_HERE') {
    console.log('❌ Please set your actual User ID in this script first!');
    console.log('   Get it from the Webhook tab in Luxafor software.');
    return;
  }

  const testActions = [
    {
      name: 'Turn Off',
      endpoint: 'solid_color',
      payload: {
        userId: USER_ID,
        actionFields: {
          color: 'custom',
          custom_color: '000000'
        }
      }
    },
    {
      name: 'Set Red',
      endpoint: 'solid_color',
      payload: {
        userId: USER_ID,
        actionFields: {
          color: 'red'
        }
      }
    },
    {
      name: 'Set Green',
      endpoint: 'solid_color',
      payload: {
        userId: USER_ID,
        actionFields: {
          color: 'green'
        }
      }
    },
    {
      name: 'Blink Blue',
      endpoint: 'blink',
      payload: {
        userId: USER_ID,
        actionFields: {
          color: 'blue'
        }
      }
    }
  ];

  for (const action of testActions) {
    try {
      console.log(`🔴 Testing: ${action.name}`);
      const response = await axios.post(`${baseUrl}/${action.endpoint}`, action.payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        console.log(`✅ ${action.name}: Success`);
        console.log(`   Response: ${JSON.stringify(response.data)}`);
      } else {
        console.log(`❌ ${action.name}: Unexpected status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${action.name}: Failed`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${JSON.stringify(error.response.data)}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }
    console.log('');
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('🎉 API testing complete!');
}

testLuxaforAPI().catch(console.error);
