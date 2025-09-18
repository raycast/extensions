# Notion Search Without API access token

This notion extension is for people who can NOT use regular notion API if you do not have
admin access to your workplace account.

This is similar to the https://github.com/wrjlewis/notion-search-alfred-workflow extension for
Alfred.

Please follow the following guidelines to setup.

## Obtaining your credentials

Visit the Notion webapp and use your browser developer tools to see the network requests being made
when you type in anything to the quick find search bar.

Here you'll see a request called search, check the request headers to copy the cookie value and
check the request payload to copy your notionSpaceId.

**Known issue**: Some users have experienced issues with copying these values directly from developer
tools, but have seen success by copying and pasting the values into TextEdit or a different text
editor first, this probably "strips out" or removes any problematic formatting.

![](https://camo.githubusercontent.com/3f4f7b5cfd031dec5ac4e83252b92060d34d8d23e551813ef1e4552414094a56/68747470733a2f2f692e696d6775722e636f6d2f79746577467a452e676966)

### Get your `cookie` headers

They should look something like this

```text
intercom-id-gpfdrxfd=7fcea1e2-4f73-492f-9b38-0d5fcf02cd9a; notion_locale=...
```

![](https://github.com/wrjlewis/notion-search-alfred-workflow/raw/master/cookie.png)

### Get your `SpaceId`

It should look something like this:

```text
celcl9aa-c3l7-7504-ca19-0c985e34ll8d
```

![](https://github.com/wrjlewis/notion-search-alfred-workflow/raw/master/spaceId.png)
