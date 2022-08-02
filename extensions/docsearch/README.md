# DocSearch

Link **all DocSearch** into Raycast.

![interface](./metadata/docsearch-1.png)

### Add Other Documentation

1. The documentation web is supported [DocSearch](https://docsearch.camunda.com/).
2. Open developer tools and input something in the search bar.
![developer_tools](./assets/developer_tools.jpg)
3. Input DocSearch data into [APIData.ts](/src/algolia/APIData.ts), like below.
   ```ts
   {
        name: 'Vuepress v1',
        icon: 'https://vuepress.vuejs.org/hero.png',
        // You can find the icon URL in html head
        APIKey: '3a539aab83105f01761a137c61004d85',
        APPID: 'BH4D9OD16A',
        indexName: 'vuepress',
        homepage: 'https://vuepress.vuejs.org/',
   }
   ```
4. Enjoy! Welcome to contribute.
