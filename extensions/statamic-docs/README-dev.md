# Updating fallback results

When a new version of Statamic is released, we'll need to update the fallback results returned when no query is provided.

To generate the fallback results, run the following script in your browser on [statamic.dev](https://statamic.dev).

```js
function extractNavigation() {
    const result = {};

    // Find all main navigation list items
    const sections = document.querySelectorAll('nav.c-nav-sidebar-with-popover-api__desktop > ul > li');

    sections.forEach(section => {
        // Get the section label (the text content of the label element)
        const labelElement = section.querySelector('label');

        if (labelElement) {
            // Extract section name (first line of text, cleaned up)
            const sectionName = labelElement.textContent.trim().split('\n')[0].trim();

            // Find all nav links in this section's ul
            const navLinks = section.querySelectorAll('ul a[wire\\:navigate]');

            if (navLinks.length > 0) {
                result[sectionName] = [];

                navLinks.forEach(link => {
                    const url = link.getAttribute('href');
                    const title = link.textContent.trim();

                    // Generate ID from URL
                    let id = url;
                    if (id.startsWith('/')) {
                        id = id.substring(1);
                    }
                    if (id === '') {
                        id = 'learn-statamic';
                    }
                    id = id.replace(/\//g, '-');

                    result[sectionName].push({
                        id: id,
                        hierarchy_lvl0: sectionName,
                        hierarchy_lvl1: title,
                        search_content: null,
                        url: url
                    });
                });
            }
        }
    });

    return result;
}

// Execute and log
const data = extractNavigation();
console.log(JSON.stringify(data, null, 2));
```

You should save the output to `assets/docs/6.x.json` (obviously replace `6.x` with the actual version number).

You should also add the new version to the `switch` statement in `src/statamic.tsx`. Make sure to change the version used by the `default` case as well.
