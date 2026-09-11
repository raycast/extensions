To update the latest AI models, please follow these steps:

- Go to https://t3.chat/settings/models
- Run this javascript in the console:
  
  ```javascript
    const html = document.body.innerHTML;
    const regex = /href="\/settings\/models\/([^"]+)"[^>]*>([^<]+)<\/a>/g;
    const results = [];
    let match;

    while ((match = regex.exec(html)) !== null) {
        results.push({
            title: match[2].trim(),
            value: match[1].trim()
        });
    }

    // Sort the array alphabetically by title
    results.sort((a, b) => a.title.localeCompare(b.title));

    // Log the final array as a formatted string for easy copying
    console.log(JSON.stringify(results, null, 2));
  ```
- Copy paste the result in package.json in the right section
- Update the changelog