# Matter
View your saved for later articles from Matter inside [Raycast](https://www.raycast.com/). 

![Matter extension for Raycast](https://user-images.githubusercontent.com/57217296/209464852-a681e81b-8b41-4fbb-a8fe-84eb19617a28.png)

## Features
- 📰 displayed articles saved in Matter
- 🔢 word count displayed

## Get your Matter token
This token is needed for the API calls to the Matter service to show your saved articles. Since Matter doesn't officially provide an API token in the account settings we have to dig into their requests to find it. 

1. Visit [Matter Webpage](web.getmatter.com) and login. 
2. Right-click and select 'Inspect'.
3. Switch to the Network tab and make sure the record network activity is on.
4. Hard refresh the page using CMD + Shift + R and select the first new request queue.
5. Inside Request headers there should be a cookie field with access_token. That's your Matter token we're looking for.
6. Copy the access_token and paste it inside the extension.

![matterApiKey](https://user-images.githubusercontent.com/57217296/209464971-31fc0e8f-7637-4110-bb81-6515e180cf41.png)
