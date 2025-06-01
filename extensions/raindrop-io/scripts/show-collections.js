async function showCollections() {
  const fetch = (await import('node-fetch')).default;
  try {
    // package.jsonからtoken情報を読み取る
    const token = process.env.RAINDROP_TOKEN;
    
    if (!token) {
      console.error('Error: RAINDROP_TOKEN environment variable is not set');
      console.log('Usage: RAINDROP_TOKEN=your_token npm run show-collections');
      process.exit(1);
    }

    const response = await fetch('https://api.raindrop.io/rest/v1/collections', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('\n=== Raindrop.io Collections ===\n');
    
    if (data.items && data.items.length > 0) {
      data.items.forEach(collection => {
        console.log(`ID: ${collection._id}`);
        console.log(`Title: ${collection.title}`);
        console.log(`Count: ${collection.count || 0}`);
        if (collection.parent && collection.parent.$id > 0) {
          console.log(`Parent ID: ${collection.parent.$id}`);
        }
        console.log('---');
      });
      
      // Archive collectionを探して強調表示
      const archiveCollection = data.items.find(c => c.title.toLowerCase() === 'archive');
      if (archiveCollection) {
        console.log('\n📦 Archive Collection Found:');
        console.log(`   ID: ${archiveCollection._id}`);
        console.log(`   Title: ${archiveCollection.title}`);
      } else {
        console.log('\n⚠️  No "archive" collection found!');
      }
    } else {
      console.log('No collections found.');
    }
    
  } catch (error) {
    console.error('Error fetching collections:', error.message);
    process.exit(1);
  }
}

showCollections();