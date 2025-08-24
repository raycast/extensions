export const markdowns = {
  welcome: `
# Welcome to trovu.net

_Web search as if from your command line: Trovu's shortcuts take you directly to the search results of other sites.
[Read more](https://trovu.net/docs/), watch a [video](https://www.youtube.com/watch?v=gOUNhCion9M), or try the examples:_

- [\`g berlin\`](https://trovu.net/process/index.html?#query=g%20berlin) Search Google for Berlin
- [\`w berlin\`](https://trovu.net/process/index.html?#query=w%20berlin) Go to the Wikipedia article about Berlin
- [\`fr.w berlin\`](https://trovu.net/process/index.html?#query=fr.w%20berlin) Go to the French Wikipedia article about Berlin
- [\`gd london, liverpool\`](https://trovu.net/process/index.html?#query=gd%20london%2C%20liverpool) Search for a route on Google Directions from London to Liverpool
- [\`gfl ber, ibiza, fr, 28\`](https://trovu.net/process/index.html?#query=gfl%20ber%2C%20ibiza%2C%20fr%2C%2028) Search on Google Flights for a flight from Berlin to Ibiza, leaving next Friday, returning on the 28th
- [\`wg berlin\`](https://trovu.net/process/index.html?#query=wg%20berlin) Search Wikipedia for all mentions of "berlin" via Google
- [\`npm csv\`](https://trovu.net/process/index.html?#query=npm%20csv) Search the Node Package Manager for modules projects about CSV
`,
  namespaces: `
## Namespaces

Every shortcut belongs to exactly one namespace. There are namespaces for:

- languages (e.g. \`en\`, \`de\`, \`fr\`)
- countries (e.g. \`.us\`, \`.gb\`, \`.de\`)
- dictionaries (e.g. \`leo\` for leo.org, \`dcm\` for dict.com)

When searching shortcuts, filter for shortcuts of a namespace by \`ns:en\`, \`ns:de\`, \`ns:fr\`, etc.

When calling a query, you can ensure a namespace to be used by prefixing your query, e.g. \`en.w berlin\`.

Read more about [namespaces](https://trovu.net/docs/shortcuts/namespaces/).
`,
  tags: `
## Tags

Tags are only used for information purposes. They do not affect which shortcut is used for a query.

When searching shortcuts, filter for shortcuts with a tag by \`tag:web-search\`, \`tag:video\`, \`tag:language\`, etc.
`,
  advanced: `
## Advanced

You can [create and manage your own user shortcuts and set advanced settings](https://trovu.net/docs/users/advanced/) via GitHub, or a self-hosted config file.

Once you have set up Trovu via your GitHub account, set your username in the Raycast extension preferences.

To get an immediate update of your shortcuts, you can trigger a reload by sending a query with \`reload\`. (Note that Github sometimes needs 5 minutes to update their cache.)

`,
};
