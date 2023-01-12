# DocSearch

Link **all DocSearch** into Raycast.

![interface](./metadata/docsearch-1.png)

### Supported Documentations

|                    Documentations                     |                                                |                                                              |
| :---------------------------------------------------: | :--------------------------------------------: | :----------------------------------------------------------: |
|     [Apollo](https://www.apollographql.com/docs)      |      [Arthas](https://arthas.aliyun.com/)      |            [Bootstrap](https://getbootstrap.com/)            |
|              [Clerk](https://clerk.dev)               |       [Dubbo](https://dubbo.apache.org/)       | [Echarts(zh-Hans)](https://echarts.apache.org/zh/index.html) |
|  [Echarts](https://echarts.apache.org/en/index.html)  |      [GitBook](https://docs.gitbook.com/)      |                 [Homebrew](https://brew.sh/)                 |
|            [IPFS](https://docs.ipfs.tech/)            |      [Laravel 9.x](https://laravel.com/)       |                 [Nuxt](https://nuxtjs.org/)                  |
|            [Nuxt3](https://v3.nuxtjs.org/)            |        [Prettier](https://prettier.io/)        |              [RSSHub](https://docs.rsshub.app/)              |
|      [Raycast](https://developers.raycast.com/)       | [React(zh-Hans)](https://zh-hans.reactjs.org/) |                [React](https://reactjs.org/)                 |
| [React Bootstrap](https://react-bootstrap.github.io/) |    [React Native](https://reactnative.dev/)    |                 [Remix](https://remix.run/)                  |
|        [Slidev(zh-Hans)](https://cn.sli.dev/)         |           [Slidev](https://sli.dev/)           |            [Supabase](https://supabase.com/docs)             |
|      [TailwindCSS v3](https://tailwindcss.com/)       |        [Unidata](https://unidata.app/)         |           [Vite(zh-Hans)](https://cn.vitejs.dev/)            |
|              [Vite](https://vitejs.dev/)              |         [Vitest](https://vitest.dev/)          |           [Vue Router4](https://router.vuejs.org/)           |
|          [Vue3(zh-Hans)](https://vuejs.org/)          |           [Vue3](https://vuejs.org/)           |                [VueUse](https://vueuse.org/)                 |
|      [Vuepress v1](https://vuepress.vuejs.org/)       | [Vuepress v2](https://v2.vuepress.vuejs.org/)  |             [pnpm(zh-Hans)](https://pnpm.io/zh)              |

| [pnpm](https://pnpm.io/zh)

### Add Other Documentation

1. The documentation web is supported [DocSearch](https://docsearch.camunda.com/).
2. Open developer tools and input something in the search bar.
   ![developer_tools](./assets/developer_tools.jpg)
3. Input DocSearch data into [apiData.ts](/src/algolia/apiData.ts), like below.
   ```ts
   {
        name: 'Vuepress v1',
        icon: 'https://vuepress.vuejs.org/hero.png',
        // You can find the icon URL in html head
        apiKey: '3a539aab83105f01761a137c61004d85',
        appID: 'BH4D9OD16A',
        indexName: 'vuepress',
        homepage: 'https://vuepress.vuejs.org/',
   }
   ```
4. Enjoy! Welcome to contribute.
